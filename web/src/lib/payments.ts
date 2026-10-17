import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { sendOrderConfirmedMail } from "@/lib/emails/order-confirmed";
import { notifyNewOrder } from "@/lib/emails/shop-alerts";
import {
  notifyPartialRefundFailed,
  notifyRefundFailed,
  sendOrderCancelledMail,
  sendPartialCancelMail,
} from "@/lib/emails/order-cancelled";
import type { CancelCause } from "@/lib/emails/templates";

// 결제 확정 공용 로직 — success 페이지·토스 웹훅이 함께 사용.
// 원칙: 클라이언트가 준 금액 불신. 승인 금액은 서버 DB(orders.total_price) 기준.
// 확정 RPC(confirm_order_paid)는 service_role 전용(0009).

const TOSS_API = "https://api.tosspayments.com/v1/payments";

function tossAuth(): string {
  return `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64")}`;
}

// final: 재시도해도 결과가 달라지지 않는 확정 실패(재고 소진·상태 불일치 등).
// 웹훅이 이를 200 으로 수신 확인해 무의미한 토스 재시도를 끊는다.
export type ConfirmResult = { ok: boolean; error?: string; final?: boolean };

export async function confirmPayment(
  paymentKey: string,
  orderId: string,
): Promise<ConfirmResult> {
  if (!process.env.TOSS_SECRET_KEY)
    return { ok: false, error: "토스 시크릿 키 미설정" };
  if (!adminConfigured())
    return { ok: false, error: "서버 키 미설정" };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, total_price, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없습니다." };
  if (order.status === "paid") return { ok: true }; // 멱등

  // 토스 승인 — 금액은 DB 주문 금액. (클라이언트가 조작한 금액으로 승인 불가)
  const res = await fetch(`${TOSS_API}/confirm`, {
    method: "POST",
    headers: { Authorization: tossAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey, orderId, amount: order.total_price }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 이미 승인된 결제(새로고침/웹훅 경합) → 실제 결제 내역을 조회해 검증
    if (body.code === "ALREADY_PROCESSED_PAYMENT") {
      const ver = await fetch(`${TOSS_API}/${paymentKey}`, {
        headers: { Authorization: tossAuth() },
      });
      if (!ver.ok) return { ok: false, error: "결제 조회 실패" };
      const p = await ver.json();
      if (
        p.orderId !== orderId ||
        p.status !== "DONE" ||
        p.totalAmount !== order.total_price
      )
        return { ok: false, error: "결제 정보가 주문과 일치하지 않습니다." };
    } else {
      // 승인 거부의 실제 원인은 body.code 에 있다(message 는 고객용 요약뿐이라
      // "업체 사정으로 결제가 중지" 같은 모호한 문구로 원인이 가려진다). 로그에
      // code·message·HTTP 상태·orderId 를 남겨 Vercel Logs 에서 바로 진단한다.
      // (가맹점 미개시=NOT_AVAILABLE_PAYMENT, 키/MID 불일치=UNAUTHORIZED_KEY 등)
      console.error(
        `[payments] confirm 거부 status=${res.status} code=${body.code} message=${body.message} orderId=${orderId} paymentKey=${paymentKey}`,
      );
      return { ok: false, error: body.message || "결제 승인 실패" };
    }
  }

  // 주문 확정(paid) + 재고 차감 — service_role 전용 RPC, 금액 재검증·재고 검증(멱등)
  const { data: result, error } = await admin.rpc("confirm_order_paid", {
    p_order_id: orderId,
    p_amount: order.total_price,
  });

  // 승인 후 재고 소진 판명(동시 주문 경합) — 결제를 자동 취소(전액 환불)
  if (result === "out_of_stock") {
    const cancel = await fetch(`${TOSS_API}/${paymentKey}/cancel`, {
      method: "POST",
      headers: { Authorization: tossAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason: "재고 부족 자동 취소" }),
    });
    if (!cancel.ok) {
      // 주문은 cancelled 인데 환불 실패 — 토스 대시보드에서 수동 취소 필요
      console.error(
        `[payments] 재고부족 자동취소 실패: 수동 환불 필요 orderId=${orderId} paymentKey=${paymentKey}`,
      );
      await notifyRefundFailed(orderId, "재고 부족 자동 취소 중 환불 실패");
    } else {
      // 취소·환불 안내(#780). 같은 주문의 재확정 시도는 RPC 가 not_pending 을 돌려줘
      // 여기 다시 오지 않는다(최초 1회).
      await sendOrderCancelledMail(orderId, "out_of_stock").catch((e) =>
        console.error("[payments] 취소 메일 실패 orderId=", orderId, e),
      );
    }
    return {
      ok: false,
      final: true,
      error:
        "죄송합니다. 결제 중 재고가 소진되어 주문이 취소되었습니다. 결제 금액은 전액 환불됩니다.",
    };
  }

  if (error || (result !== "confirmed" && result !== "already_paid"))
    return {
      ok: false,
      // RPC 가 상태 코드를 반환한 경우(상태·금액 불일치)는 재시도 무의미.
      // error(연결 실패 등)만 재시도 대상.
      final: !error,
      error: `주문 확정 실패(${result ?? error?.message})`,
    };

  // 주문 확인 메일 (#129) — 'confirmed'(최초 확정)일 때만 보낸다.
  // 성공 페이지와 웹훅이 같은 주문을 동시에 확정하려 하면 한쪽은 'already_paid' 를
  // 받으므로, 이 조건이 곧 중복 발송 방지다.
  // 발송 실패가 결제 확정을 되돌리지 않는다 — 메일은 부가 통지이고, 실패는 로그에 남는다.
  if (result === "confirmed") {
    await sendOrderConfirmedMail(orderId).catch((e) =>
      console.error("[payments] 주문 확인 메일 실패 orderId=", orderId, e),
    );
    // 대표님께 새 주문 알림(#785). 같은 최초 1회 조건.
    await notifyNewOrder(orderId).catch((e) =>
      console.error("[payments] 새 주문 알림 실패 orderId=", orderId, e),
    );
  }


  return { ok: true };
}

export type CancelResult = { ok: boolean; error?: string };

// 배송 전(paid) 주문 전액 취소 — 서버 액션(본인 주문 검증 후) 공용 로직.
// 순서: RPC(잠금 하 paid 확인 → cancelled + 재고 복원) 먼저 → 토스 환불 나중.
// 환불을 먼저 하면 배송 처리와 경합 시 "배송됐는데 환불" 가능(0011 주석 참고).
// 멱등: cancelled 주문 재호출 시 토스 취소만 재확인 → 환불 실패 재시도 가능.
// reason 은 토스 취소 사유(상점관리자·결제내역에 남음) — 손님 취소/관리자 취소 구분.
// cause 는 손님에게 보내는 취소 안내 메일(#780)의 문구 구분.
export async function cancelPaidOrder(
  orderId: string,
  reason = "고객 주문 취소",
  cause: CancelCause = "customer",
): Promise<CancelResult> {
  if (!process.env.TOSS_SECRET_KEY)
    return { ok: false, error: "토스 시크릿 키 미설정" };
  if (!adminConfigured()) return { ok: false, error: "서버 키 미설정" };

  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc("cancel_paid_order", {
    p_order_id: orderId,
  });
  if (error) return { ok: false, error: "주문 취소에 실패했습니다." };
  if (result === "not_found")
    return { ok: false, error: "주문을 찾을 수 없습니다." };
  if (result === "not_cancellable")
    return {
      ok: false,
      error: "배송이 시작된 주문은 취소할 수 없습니다. 문의 게시판을 이용해 주세요.",
    };

  // 주문은 cancelled 확정 — 이제 토스 환불. 결제 조회(orderId → paymentKey).
  const lookup = await fetch(`${TOSS_API}/orders/${orderId}`, {
    headers: { Authorization: tossAuth() },
  });
  if (!lookup.ok) {
    console.error(
      `[payments] 주문 취소 후 결제 조회 실패: 수동 환불 확인 필요 orderId=${orderId}`,
    );
    await notifyRefundFailed(orderId, `결제 조회 실패(HTTP ${lookup.status})`);
    return {
      ok: false,
      error: "취소는 접수되었으나 환불 확인에 실패했습니다. 문의해 주세요.",
    };
  }
  const payment = await lookup.json();
  // 취소 안내 메일(#780)은 처음 취소됐을 때, 또는 재시도에서 이번에 실제로 환불됐을 때만.
  // 이미 취소·환불까지 끝난 주문을 다시 부르면(멱등 재호출) 보내지 않는다.
  let refundedNow = false;
  if (payment.status !== "CANCELED") {
    const cancel = await fetch(`${TOSS_API}/${payment.paymentKey}/cancel`, {
      method: "POST",
      headers: { Authorization: tossAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason: reason }),
    });
    if (!cancel.ok) {
      const body = await cancel.json().catch(() => ({}));
      if (body.code !== "ALREADY_CANCELED_PAYMENT") {
        console.error(
          `[payments] 주문 취소 후 환불 실패: 수동 환불 필요 orderId=${orderId} paymentKey=${payment.paymentKey}`,
        );
        await notifyRefundFailed(orderId, `토스 환불 실패(${body.code ?? cancel.status})`);
        return {
          ok: false,
          error: "취소는 접수되었으나 환불 처리에 실패했습니다. 문의해 주세요.",
        };
      }
    } else {
      refundedNow = true;
    }
  }

  if (result !== "already_cancelled" || refundedNow) {
    await sendOrderCancelledMail(orderId, cause).catch((e) =>
      console.error("[payments] 취소 메일 실패 orderId=", orderId, e),
    );
  }

  return { ok: true };
}

// ── 부분취소(품절) ───────────────────────────────────────────
// 대표님 정책(#844): 취소한 상품 금액만 환불하고 배송비·쿠폰은 그대로. 배송 전(paid)만.
// 순서: ① 토스 결제 조회(부분취소 가능·잔액 일치, DB 를 건드리기 전) → ② RPC(잠금 하
// 수량·금액 감소·재고 복원·기록) → ③ 토스 cancelAmount 환불 → 환불 시각·손님 메일.
// 전체 취소와 같은 이유로 DB 먼저, 환불 나중(배송 처리와의 경합). ③이 실패하면 기록은
// 환불 전으로 남고 대표님께 알림이 가며, 관리자 화면 '환불 다시 시도'가 ③만 다시 한다.

export const PARTIAL_CANCEL_REASON = "품절로 인한 부분취소";
// 토스 호출 제한 시간. 환불 선점(claim_partial_refund)이 1분이라 그보다 충분히 짧게.
const TOSS_TIMEOUT_MS = 20_000;

const PARTIAL_ERRORS: Record<string, string> = {
  not_found: "주문을 찾을 수 없습니다.",
  not_cancellable: "배송 전(결제 완료) 주문만 부분취소할 수 있습니다.",
  item_not_found: "취소할 상품을 찾을 수 없습니다.",
  invalid_quantity: "취소 수량이 올바르지 않습니다.",
  use_full_cancel: "이 상품을 빼면 남는 상품이 없어요. 주문 취소(전액 환불)를 이용해 주세요.",
  zero_amount: "환불할 금액이 없는 상품입니다.",
  exceeds_paid:
    "할인 때문에 환불액이 남은 결제 금액보다 커요. 주문 취소(전액 환불)를 이용해 주세요.",
};

type TossCancel = { cancelAmount: number; cancelReason?: string; cancelStatus?: string };
type TossPayment = {
  paymentKey: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  isPartialCancelable?: boolean;
  cancels?: TossCancel[] | null;
};

async function lookupPayment(orderId: string): Promise<TossPayment | null> {
  const res = await fetch(`${TOSS_API}/orders/${orderId}`, {
    headers: { Authorization: tossAuth() },
    signal: AbortSignal.timeout(TOSS_TIMEOUT_MS),
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as TossPayment;
}

// 토스 취소 내역에서 이 기록을 찾는 표식. cancelReason 끝에 붙인다(상점관리자에도 보임).
const refundTag = (cancelId: string) => `[${cancelId.slice(0, 8)}]`;

export type PartialCancelResult = { ok: boolean; error?: string; amount?: number };

export async function partialCancelOrderItem(
  orderId: string,
  itemId: string,
  quantity: number,
): Promise<PartialCancelResult> {
  if (!process.env.TOSS_SECRET_KEY)
    return { ok: false, error: "토스 시크릿 키 미설정" };
  if (!adminConfigured()) return { ok: false, error: "서버 키 미설정" };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("status, total_price")
    .eq("id", orderId)
    .maybeSingle<{ status: string; total_price: number }>();
  if (!order) return { ok: false, error: PARTIAL_ERRORS.not_found };
  if (order.status !== "paid") return { ok: false, error: PARTIAL_ERRORS.not_cancellable };

  // ① 토스 쪽이 부분취소를 받을 수 있는지, 잔액이 사이트 금액과 같은지 먼저 본다.
  //    상점관리자에서 따로 취소한 내역이 있으면 잔액이 달라 여기서 멈춘다(이중 환불 방지).
  const payment = await lookupPayment(orderId);
  if (!payment)
    return { ok: false, error: "결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  if (payment.status !== "DONE" && payment.status !== "PARTIAL_CANCELED")
    return { ok: false, error: `부분취소할 수 없는 결제 상태입니다(${payment.status}).` };
  if (payment.isPartialCancelable === false)
    return {
      ok: false,
      error: "이 결제 수단은 부분취소가 안 됩니다. 주문 취소(전액 환불)를 이용해 주세요.",
    };
  if (payment.balanceAmount !== order.total_price) {
    console.error(
      `[payments] 부분취소 중단: 토스 잔액과 주문 금액 불일치 orderId=${orderId} balance=${payment.balanceAmount} total=${order.total_price}`,
    );
    return {
      ok: false,
      error:
        "토스 결제 잔액과 사이트 주문 금액이 달라요. 상점관리자에서 직접 취소한 내역이 있는지 확인해 주세요.",
    };
  }

  // ② 잠금 하 검증·수량/금액 감소·재고 복원·기록.
  const { data, error } = await admin.rpc("partial_cancel_order_item", {
    p_order_id: orderId,
    p_item_id: itemId,
    p_quantity: quantity,
    p_reason: PARTIAL_CANCEL_REASON,
  });
  const res = data as { result: string; cancel_id?: string; amount?: number } | null;
  if (error || !res) return { ok: false, error: "부분취소에 실패했습니다." };
  if (res.result !== "cancelled" || !res.cancel_id || !res.amount)
    return { ok: false, error: PARTIAL_ERRORS[res.result] ?? "부분취소에 실패했습니다." };

  // ③ 토스 환불.
  const refund = await refundPartialCancel(res.cancel_id);
  if (!refund.ok)
    return {
      ok: false,
      amount: res.amount,
      error:
        refund.error ??
        "취소는 처리됐지만 환불에 실패했습니다. 주문 관리에서 '환불 다시 시도'를 눌러 주세요.",
    };
  return { ok: true, amount: res.amount };
}

// 부분취소 기록 하나의 토스 환불(최초·재시도 공용). 절대 더 많이 환불하지 않는 쪽으로:
//   · 선점(claim) — 1분 안의 겹친 시도는 건너뜀
//   · 토스 취소 내역에 이 기록 표식이 있으면 이미 환불된 것 → 기록만 맞춘다
//   · 토스가 이미 돌려준 총액이 사이트 누계(refunded_amount) 이상이면 더 줄 것이 없다
//     (그 사이 전체 취소됐거나 상점관리자에서 직접 환불한 경우)
//   · 아직 돌려줄 금액보다 이 기록이 크면 자동 환불을 멈추고 대표님께 확인 요청
export async function refundPartialCancel(
  cancelId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.TOSS_SECRET_KEY) return { ok: false, error: "토스 시크릿 키 미설정" };
  if (!adminConfigured()) return { ok: false, error: "서버 키 미설정" };
  const admin = createAdminClient();

  const { data: claimed } = await admin.rpc("claim_partial_refund", {
    p_cancel_id: cancelId,
  });
  const c = (claimed as { order_id: string; amount: number; reason: string; attempted_at: string }[] | null)?.[0];
  if (!c) {
    const { data: row } = await admin
      .from("order_partial_cancels")
      .select("refunded_at")
      .eq("id", cancelId)
      .maybeSingle<{ refunded_at: string | null }>();
    if (row?.refunded_at) return { ok: true };
    return { ok: false, error: "다른 환불 시도가 진행 중이에요. 1분 뒤 다시 눌러 주세요." };
  }

  const fail = async (why: string, error?: string) => {
    console.error(`[payments] 부분취소 환불 실패 cancelId=${cancelId} orderId=${c.order_id} ${why}`);
    await notifyPartialRefundFailed(cancelId, why);
    return { ok: false, error };
  };
  // 환불 확인 — 처음 찍힐 때만 손님 메일(이미 전체 취소된 주문이면 취소 메일이 갔으니 생략).
  const markRefunded = async (mail: boolean) => {
    const { data: marked } = await admin
      .from("order_partial_cancels")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", cancelId)
      .is("refunded_at", null)
      .select("id");
    if (mail && marked && marked.length > 0)
      await sendPartialCancelMail(cancelId).catch((e) =>
        console.error("[payments] 부분취소 메일 실패 cancelId=", cancelId, e),
      );
    return { ok: true };
  };

  const { data: order } = await admin
    .from("orders")
    .select("status, refunded_amount")
    .eq("id", c.order_id)
    .maybeSingle<{ status: string; refunded_amount: number }>();
  if (!order) return fail("주문 없음", "주문을 찾을 수 없습니다.");

  const payment = await lookupPayment(c.order_id);
  if (!payment) return fail("결제 조회 실패");

  const tag = refundTag(cancelId);
  const tagged = (payment.cancels ?? []).some(
    (x) => x.cancelStatus === "DONE" && String(x.cancelReason ?? "").includes(tag),
  );
  const tossRefunded = payment.totalAmount - payment.balanceAmount;
  if (tagged || tossRefunded >= order.refunded_amount)
    return markRefunded(order.status !== "cancelled");

  const owed = order.refunded_amount - tossRefunded;
  if (c.amount > owed)
    return fail(
      `토스 환불 내역과 맞지 않음(돌려줄 금액 ${owed}원 < 이 기록 ${c.amount}원)`,
      "토스 환불 내역과 맞지 않아 자동 환불을 멈췄어요. 상점관리자에서 이 주문의 취소 내역을 확인해 주세요.",
    );

  const cancel = await fetch(`${TOSS_API}/${payment.paymentKey}/cancel`, {
    method: "POST",
    headers: {
      Authorization: tossAuth(),
      "Content-Type": "application/json",
      // 같은 시도의 네트워크 재전송이 두 번 환불되지 않게. 시도마다 새 키(선점 시각).
      "Idempotency-Key": `${cancelId}-${Date.parse(c.attempted_at)}`,
    },
    body: JSON.stringify({ cancelReason: `${c.reason} ${tag}`, cancelAmount: c.amount }),
    signal: AbortSignal.timeout(TOSS_TIMEOUT_MS),
  }).catch(() => null);
  if (!cancel?.ok) {
    const body = cancel ? await cancel.json().catch(() => ({})) : {};
    return fail(`토스 환불 실패(${(body as { code?: string }).code ?? cancel?.status ?? "응답 없음"})`);
  }
  return markRefunded(true);
}

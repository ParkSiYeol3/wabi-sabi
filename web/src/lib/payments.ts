import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

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
    if (!cancel.ok)
      // 주문은 cancelled 인데 환불 실패 — 토스 대시보드에서 수동 취소 필요
      console.error(
        `[payments] 재고부족 자동취소 실패 — 수동 환불 필요 orderId=${orderId} paymentKey=${paymentKey}`,
      );
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

  return { ok: true };
}

export type CancelResult = { ok: boolean; error?: string };

// 배송 전(paid) 주문 전액 취소 — 서버 액션(본인 주문 검증 후) 공용 로직.
// 순서: RPC(잠금 하 paid 확인 → cancelled + 재고 복원) 먼저 → 토스 환불 나중.
// 환불을 먼저 하면 배송 처리와 경합 시 "배송됐는데 환불" 가능(0011 주석 참고).
// 멱등: cancelled 주문 재호출 시 토스 취소만 재확인 → 환불 실패 재시도 가능.
export async function cancelPaidOrder(orderId: string): Promise<CancelResult> {
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
      `[payments] 주문 취소 후 결제 조회 실패 — 수동 환불 확인 필요 orderId=${orderId}`,
    );
    return {
      ok: false,
      error: "취소는 접수되었으나 환불 확인에 실패했습니다. 문의해 주세요.",
    };
  }
  const payment = await lookup.json();
  if (payment.status !== "CANCELED") {
    const cancel = await fetch(`${TOSS_API}/${payment.paymentKey}/cancel`, {
      method: "POST",
      headers: { Authorization: tossAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason: "고객 주문 취소" }),
    });
    if (!cancel.ok) {
      const body = await cancel.json().catch(() => ({}));
      if (body.code !== "ALREADY_CANCELED_PAYMENT") {
        console.error(
          `[payments] 주문 취소 후 환불 실패 — 수동 환불 필요 orderId=${orderId} paymentKey=${payment.paymentKey}`,
        );
        return {
          ok: false,
          error: "취소는 접수되었으나 환불 처리에 실패했습니다. 문의해 주세요.",
        };
      }
    }
  }

  return { ok: true };
}

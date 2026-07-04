import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// 결제 확정 공용 로직 — success 페이지·토스 웹훅이 함께 사용.
// 원칙: 클라이언트가 준 금액 불신. 승인 금액은 서버 DB(orders.total_price) 기준.
// 확정 RPC(confirm_order_paid)는 service_role 전용(0009).

const TOSS_API = "https://api.tosspayments.com/v1/payments";

function tossAuth(): string {
  return `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64")}`;
}

export type ConfirmResult = { ok: boolean; error?: string };

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

  // 주문 확정(paid) + 재고 차감 — service_role 전용 RPC, 금액 재검증(멱등)
  const { data: result, error } = await admin.rpc("confirm_order_paid", {
    p_order_id: orderId,
    p_amount: order.total_price,
  });
  if (error || (result !== "confirmed" && result !== "already_paid"))
    return { ok: false, error: `주문 확정 실패(${result ?? error?.message})` };

  return { ok: true };
}

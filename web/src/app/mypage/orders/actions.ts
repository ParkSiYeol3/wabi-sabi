"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cancelPaidOrder, type CancelResult } from "@/lib/payments";

// 본인 주문 취소 — 배송 전(paid)만. 실 취소·환불은 lib/payments(RPC + 토스).
export async function cancelMyOrder(orderId: string): Promise<CancelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 소유 검증(RLS 로도 본인 것만 보이지만 명시 확인)
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없습니다." };
  if (order.status !== "paid")
    return {
      ok: false,
      error:
        order.status === "cancelled"
          ? "이미 취소된 주문입니다."
          : "결제 완료(배송 전) 상태의 주문만 취소할 수 있습니다.",
    };

  const result = await cancelPaidOrder(orderId);
  if (result.ok) revalidatePath("/mypage/orders");
  return result;
}

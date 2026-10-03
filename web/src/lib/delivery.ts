import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderDeliveredMail } from "@/lib/emails/order-delivered";

// 배송완료 처리 한 곳(#791). 관리자 버튼(markDelivered, 누른 시각)과 우체국 자동 확인
// (크론, 실제 배달 시각)이 같은 경로를 탄다. 수령일(delivered_at)은 청약철회 7일의 기산점.
// 취소·미결제·이미 완료된 주문은 조건에 걸려 0행 → false(메일도 안 보냄 = 1회 보장).
// 대면거래도 있어 송장 없이 paid 에서 바로 완료도 허용한다(#124).
export async function completeDelivery(orderId: string, deliveredAt: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("orders")
    .update({ status: "delivered", delivered_at: deliveredAt })
    .eq("id", orderId)
    .in("status", ["paid", "shipping"])
    .select("id");
  if (!data || data.length === 0) return false;

  // 손님에게 배송 완료 + 리뷰 요청(#783). 실패해도 배송완료는 유지.
  await sendOrderDeliveredMail(orderId).catch((e) =>
    console.error("[delivery] 배송완료 메일 실패 orderId=", orderId, e),
  );
  return true;
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import { sendOrderShippedMail } from "@/lib/emails/order-shipped";
import { cancelPaidOrder, type CancelResult } from "@/lib/payments";

// 송장번호 입력 + 상태 배송중 전환
export async function setTracking(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const tracking = String(formData.get("tracking_number") || "")
    .trim()
    .slice(0, 100);
  if (!id) return;

  const supabase = createAdminClient();
  const { data: updated } = await supabase
    .from("orders")
    .update({
      tracking_number: tracking || null,
      status: tracking ? "shipping" : "paid",
    })
    .eq("id", id)
    // 배송완료된 주문의 송장을 고치다 상태가 shipping 으로 되돌아가면 수령일과
    // 모순된다(청약철회 기산점이 흔들린다) → paid/shipping 일 때만 허용.
    .in("status", ["paid", "shipping"])
    .select("id");

  // 조건에 걸려 아무 행도 안 바뀌었으면 감사로그를 남기지 않는다 — 남기면
  // "바꾼 적 없는 변경"이 기록돼 감사 기록 자체를 못 믿게 된다.
  if (!updated || updated.length === 0) return;

  // 배송 시작 알림 (#129) — 송장이 실제로 등록된 경우에만.
  // 송장을 지우는(=배송중 해제) 경우엔 보내지 않는다.
  if (tracking) {
    await sendOrderShippedMail(id, tracking).catch((e) =>
      console.error("[admin] 배송 알림 메일 실패 orderId=", id, e),
    );
  }

  await logAdminAction(user, {
    action: "order.set_tracking",
    targetTable: "orders",
    targetId: id,
    meta: { tracking_number: tracking || null, status: tracking ? "shipping" : "paid" },
  });
  revalidatePath("/admin/orders");
}

// 배송완료 처리 (#124) — delivered 로 가는 유일한 경로.
// 수령일(delivered_at)은 청약철회 7일의 기산점이라 함께 기록한다(#106 교환·환불 안내).
// 대면거래도 있으므로(site.addressNote) 송장 없이 paid 에서 바로 완료도 허용한다.
export async function markDelivered(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  const deliveredAt = new Date().toISOString();
  // 취소·미결제 주문이 완료로 넘어가지 않도록 상태를 조건에 건다(멱등: 이미 delivered 면 0행).
  const { data } = await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: deliveredAt })
    .eq("id", id)
    .in("status", ["paid", "shipping"])
    .select("id");

  if (!data || data.length === 0) return; // 대상 아님 — 감사로그도 남기지 않는다

  await logAdminAction(user, {
    action: "order.mark_delivered",
    targetTable: "orders",
    targetId: id,
    meta: { status: "delivered", delivered_at: deliveredAt },
  });
  revalidatePath("/admin/orders");
}

// 관리자 주문 취소 (#어드민취소) — 배송 전(paid) 주문 전액 취소·환불.
// 손님 마이페이지 취소와 같은 RPC(cancel_paid_order)를 쓴다: 잠금 하 paid 확인 →
// cancelled + 재고(값별 포함)·쿠폰 복원 → 토스 실환불. RPC 가 paid 만 받으므로
// 배송 시작(shipping) 이후 주문은 자동으로 거부된다(대면·오배송 등은 별도 처리).
// 실환불이 걸린 액션이라 클라이언트에서 확인 모달을 거친 뒤 호출한다.
export async function adminCancelOrder(orderId: string): Promise<CancelResult> {
  const user = await requireAdmin();
  if (!adminConfigured()) return { ok: false, error: "서버 키 미설정" };

  const id = parseUuid(orderId);
  if (!id) return { ok: false, error: "주문 정보가 올바르지 않습니다." };

  const result = await cancelPaidOrder(id, "관리자 취소");
  if (result.ok) {
    await logAdminAction(user, {
      action: "order.cancel",
      targetTable: "orders",
      targetId: id,
      meta: { by: "admin" },
    });
    revalidatePath("/admin/orders");
  }
  return result;
}

// 관리자 주문 기록 삭제(대표님 — 테스트 데이터 정리·기록 삭제). 결제/환불과 무관하게
// DB의 주문 기록만 영구 삭제한다. order_items·payments 는 FK on delete cascade 로
// 함께 삭제되고, user_coupons·inquiries 의 order_id 는 on delete set null 로 유지된다.
// ⚠ 환불은 하지 않는다 — 결제된 주문은 취소(adminCancelOrder)로 환불 후 삭제할 것.
// 되돌릴 수 없으므로 클라이언트에서 확인 모달을 거친 뒤 호출한다.
export async function adminDeleteOrder(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAdmin();
  if (!adminConfigured()) return { ok: false, error: "서버 키 미설정" };

  const id = parseUuid(orderId);
  if (!id) return { ok: false, error: "주문 정보가 올바르지 않습니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return { ok: false, error: "주문 삭제에 실패했습니다." };

  await logAdminAction(user, {
    action: "order.delete",
    targetTable: "orders",
    targetId: id,
    meta: { by: "admin" },
  });
  revalidatePath("/admin/orders");
  return { ok: true };
}

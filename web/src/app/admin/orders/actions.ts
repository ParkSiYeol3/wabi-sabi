"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";

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

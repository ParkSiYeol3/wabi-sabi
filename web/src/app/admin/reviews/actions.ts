"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";

// 리뷰 삭제 (관리자 — service_role 로 임의 리뷰 삭제).
export async function adminDeleteReview(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("reviews").delete().eq("id", id);
  await logAdminAction(user, {
    action: "review.delete",
    targetTable: "reviews",
    targetId: id,
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/review");
}

// 리뷰 숨김/해제 (#141) — 삭제와 달리 되돌릴 수 있는 soft-hide.
// hidden=true 면 공개 read 정책(0022)에서 걸러져 상품 페이지·목록·평점 집계에서 빠진다.
export async function adminSetReviewHidden(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;
  const hidden = formData.get("hidden") === "true";

  const supabase = createAdminClient();
  await supabase.from("reviews").update({ hidden }).eq("id", id);
  await logAdminAction(user, {
    action: hidden ? "review.hide" : "review.unhide",
    targetTable: "reviews",
    targetId: id,
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/review");
}

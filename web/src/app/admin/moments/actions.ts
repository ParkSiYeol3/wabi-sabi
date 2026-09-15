"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { deleteProductImage } from "@/lib/storage";
import { logAdminAction } from "@/lib/audit";
import { sanitizeProductIds } from "@/lib/moment-products";

// "오늘의 와비사비" 모더레이션 (관리자) — 숨김 토글 / 삭제. service_role 로 RLS 우회.
const idSchema = z.string().uuid();

export async function adminSetMomentHidden(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const hidden = String(formData.get("hidden")) === "true";
  if (!idSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("wabi_moments")
    .update({ hidden })
    .eq("id", id);
  if (error) {
    console.error("[admin] moment 숨김 실패", id, error);
    return;
  }
  await logAdminAction(user, {
    action: "moment.set_hidden",
    targetTable: "wabi_moments",
    targetId: id,
    meta: { hidden },
  });
  revalidatePath("/today");
  revalidatePath("/admin/moments");
}

export async function adminDeleteMoment(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  if (!idSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("wabi_moments")
    .select("image_url, image_urls")
    .eq("id", id)
    .maybeSingle<{ image_url: string; image_urls: string[] | null }>();

  const { error } = await supabase.from("wabi_moments").delete().eq("id", id);
  if (error) {
    console.error("[admin] moment 삭제 실패", id, error);
    return;
  }
  // 올린 사진 전부 회수(다중, 0051) — 커버만 지우면 나머지 장이 스토리지에 남는다.
  const urls = row?.image_urls?.length
    ? row.image_urls
    : row?.image_url
      ? [row.image_url]
      : [];
  await Promise.all(urls.map((u) => deleteProductImage(u)));
  await logAdminAction(user, {
    action: "moment.delete",
    targetTable: "wabi_moments",
    targetId: id,
  });
  revalidatePath("/today");
  revalidateMoment(id);
  revalidatePath("/admin/moments");
}

// 사진 속 기물 태그 고치기(#664) — 손님이 안 달았거나 잘못 단 태그를 관리자가
// 바로잡는다. 비워서 저장하면 태그가 모두 빠진다.
export async function adminSetMomentProducts(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  if (!idSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const productIds = await sanitizeProductIds(
    supabase,
    formData.getAll("product_id"),
  );
  const { error } = await supabase
    .from("wabi_moments")
    .update({ product_ids: productIds })
    .eq("id", id);
  if (error) {
    console.error("[admin] moment 태그 저장 실패", id, error);
    return;
  }
  await logAdminAction(user, {
    action: "moment.set_products",
    targetTable: "wabi_moments",
    targetId: id,
    meta: { count: productIds.length },
  });
  revalidatePath("/today");
  revalidateMoment(id);
  revalidatePath("/admin/moments");
}

// 상세 재검증용 — moment_id 가 유효하면 그 상세도 무효화한다.
function revalidateMoment(momentId: string) {
  if (idSchema.safeParse(momentId).success)
    revalidatePath(`/today/${momentId}`);
}

// 댓글 모더레이션 — 숨김 토글 / 삭제. service_role 로 RLS 우회.
export async function adminSetCommentHidden(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const momentId = String(formData.get("moment_id") || "");
  const hidden = String(formData.get("hidden")) === "true";
  if (!idSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("moment_comments")
    .update({ hidden })
    .eq("id", id);
  if (error) {
    console.error("[admin] comment 숨김 실패", id, error);
    return;
  }
  await logAdminAction(user, {
    action: "moment_comment.set_hidden",
    targetTable: "moment_comments",
    targetId: id,
    meta: { hidden },
  });
  revalidatePath("/today");
  revalidateMoment(momentId);
  revalidatePath("/admin/moments");
}

export async function adminDeleteComment(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const momentId = String(formData.get("moment_id") || "");
  if (!idSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("moment_comments")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[admin] comment 삭제 실패", id, error);
    return;
  }
  await logAdminAction(user, {
    action: "moment_comment.delete",
    targetTable: "moment_comments",
    targetId: id,
  });
  revalidatePath("/today");
  revalidateMoment(momentId);
  revalidatePath("/admin/moments");
}

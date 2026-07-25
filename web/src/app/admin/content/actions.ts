"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import { CONTENT_KEYS, ABOUT_IMAGE_KEY } from "@/lib/queries/content";
import { uploadSiteImage, deleteProductImage } from "@/lib/storage";
import type { ActionResult } from "@/app/admin/products/types";

// 편집 가능 콘텐츠 저장 (#160·#245·#249). key 는 허용된 것만(enum), 값 길이 제한.
// service_role 로 upsert(RLS write 정책 없음 → 서버 전용). 홈·About 재검증.
// useActionState 시그니처 — 폼에 저장 성공/실패 피드백을 돌려준다(#249).
const schema = z.object({
  key: z.enum(CONTENT_KEYS),
  value: z.string().trim().min(1).max(5000),
});

export async function saveContent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "서버 설정 오류(service_role 미설정)" };

  const parsed = schema.safeParse({
    key: String(formData.get("key") || ""),
    value: String(formData.get("value") || ""),
  });
  if (!parsed.success)
    return { ok: false, message: "내용을 확인해주세요. (1~5000자)" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_content").upsert({
    key: parsed.data.key,
    value: parsed.data.value,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[admin] 콘텐츠 저장 실패", parsed.data.key, error);
    return { ok: false, message: "저장에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  await logAdminAction(user, {
    action: "content.update",
    targetTable: "site_content",
    targetId: parsed.data.key,
  });

  revalidatePath("/"); // 홈 캐시된 소개문구 즉시 무효화
  revalidatePath("/about");
  revalidatePath("/admin/content");
  return { ok: true, message: "저장되었습니다." };
}

// About 매장 사진 업로드 (대표님 지시). 스토리지에 올리고 URL 을 site_content 에
// 저장. 이전 사진은 저장 성공 후 지운다(고아 파일 방지). png/jpg/webp·12MB 제한.
export async function saveAboutImage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "서버 설정 오류(service_role 미설정)" };

  const file = formData
    .getAll("image")
    .find((f): f is File => f instanceof File && f.size > 0);
  if (!file) return { ok: false, message: "사진 파일을 선택하세요." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return { ok: false, message: "png·jpg·webp 만 업로드할 수 있습니다." };
  if (file.size > 12 * 1024 * 1024)
    return { ok: false, message: "이미지는 12MB 이하여야 합니다." };

  const { url, error } = await uploadSiteImage(file, "about");
  if (!url) return { ok: false, message: `업로드 실패: ${error ?? "알 수 없는 오류"}` };

  const supabase = createAdminClient();
  const { data: prev } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", ABOUT_IMAGE_KEY)
    .maybeSingle();

  const { error: upErr } = await supabase.from("site_content").upsert({
    key: ABOUT_IMAGE_KEY,
    value: url,
    updated_at: new Date().toISOString(),
  });
  if (upErr) {
    await deleteProductImage(url); // 저장 실패 시 방금 올린 파일 회수
    console.error("[admin] 매장 사진 저장 실패", upErr);
    return { ok: false, message: "저장에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  // 이전 사진 파일 정리(부가 — 실패해도 저장은 유효).
  const old = prev?.value?.trim();
  if (old && old !== url) await deleteProductImage(old);

  await logAdminAction(user, {
    action: "content.about_image",
    targetTable: "site_content",
    targetId: ABOUT_IMAGE_KEY,
  });
  revalidatePath("/about");
  revalidatePath("/admin/content");
  return { ok: true, message: "매장 사진이 저장되었습니다." };
}

// About 매장 사진 제거 → 로고 마크 폴백으로 되돌린다.
export async function removeAboutImage(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;
  void formData;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", ABOUT_IMAGE_KEY)
    .maybeSingle();
  const url = data?.value?.trim();

  await supabase.from("site_content").delete().eq("key", ABOUT_IMAGE_KEY);
  if (url) await deleteProductImage(url);

  await logAdminAction(user, {
    action: "content.about_image_remove",
    targetTable: "site_content",
    targetId: ABOUT_IMAGE_KEY,
  });
  revalidatePath("/about");
  revalidatePath("/admin/content");
}

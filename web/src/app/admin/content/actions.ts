"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import { CONTENT_KEYS } from "@/lib/queries/content";
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

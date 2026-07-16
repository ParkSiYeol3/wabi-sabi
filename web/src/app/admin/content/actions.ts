"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import { PHILOSOPHY_KEY } from "@/lib/queries/content";

// 편집 가능 콘텐츠 저장 (#160). key 는 허용된 것만(enum), 값 길이 제한.
// service_role 로 upsert(RLS write 정책 없음 → 서버 전용). 홈·About 재검증.
const schema = z.object({
  key: z.enum([PHILOSOPHY_KEY]),
  value: z.string().trim().min(1).max(5000),
});

export async function saveContent(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const parsed = schema.safeParse({
    key: String(formData.get("key") || ""),
    value: String(formData.get("value") || ""),
  });
  if (!parsed.success) return;

  const supabase = createAdminClient();
  await supabase.from("site_content").upsert({
    key: parsed.data.key,
    value: parsed.data.value,
    updated_at: new Date().toISOString(),
  });
  await logAdminAction(user, {
    action: "content.update",
    targetTable: "site_content",
    targetId: parsed.data.key,
  });

  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin/content");
}

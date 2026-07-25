"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";

// 카테고리 이름 편집 (#246, 대표님) — slug·구조는 코드가 소유(불변), 이름만 DB.
// slug 는 URL·상품 연결에 묶여 있어 바꾸지 않는다(where 조건으로만 사용).
const schema = z.object({
  slug: z.string().trim().min(1).max(60),
  name_ko: z.string().trim().min(1).max(60),
  name_en: z.string().trim().min(1).max(60),
});

export async function updateCategoryName(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const parsed = schema.safeParse({
    slug: String(formData.get("slug") || ""),
    name_ko: String(formData.get("name_ko") || ""),
    name_en: String(formData.get("name_en") || ""),
  });
  if (!parsed.success) return;
  const { slug, name_ko, name_en } = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ name_ko, name_en })
    .eq("slug", slug);
  if (error) {
    console.error("[admin] 카테고리 이름 저장 실패", slug, error);
    return;
  }

  await logAdminAction(user, {
    action: "category.rename",
    targetTable: "categories",
    targetId: slug,
    meta: { name_ko, name_en },
  });

  // 이름이 노출되는 곳 — shop(사이드바·칩)·홈·상품 등록 select·카테고리 화면.
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
}

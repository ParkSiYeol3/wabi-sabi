"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult } from "@/app/admin/products/types";

// 카테고리 이름 편집 (#246·#249) + 추가·숨김·삭제 (0036, 대표님 지시).
// 구조도 DB 가 진실로 승격 — 단 기존 slug 는 URL·상품 연결에 묶여 바꾸지 않는다.
// useActionState 시그니처 — 폼에 저장 성공/실패 피드백을 돌려준다(#249).
const schema = z.object({
  slug: z.string().trim().min(1).max(60),
  name_ko: z.string().trim().min(1).max(60),
  name_en: z.string().trim().min(1).max(60),
});

// 이름·구조가 노출되는 곳 — 공통 무효화.
function revalidateCategoryViews() {
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
}

export async function updateCategoryName(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "서버 설정 오류(service_role 미설정)" };

  const parsed = schema.safeParse({
    slug: String(formData.get("slug") || ""),
    name_ko: String(formData.get("name_ko") || ""),
    name_en: String(formData.get("name_en") || ""),
  });
  if (!parsed.success)
    return { ok: false, message: "이름을 확인해주세요. (1~60자)" };
  const { slug, name_ko, name_en } = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ name_ko, name_en })
    .eq("slug", slug);
  if (error) {
    console.error("[admin] 카테고리 이름 저장 실패", slug, error);
    return { ok: false, message: "저장에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  await logAdminAction(user, {
    action: "category.rename",
    targetTable: "categories",
    targetId: slug,
    meta: { name_ko, name_en },
  });

  revalidateCategoryViews();
  return { ok: true, message: "저장되었습니다." };
}

// ── 추가 (0036) ───────────────────────────────────────────
// slug 는 영문 이름에서 자동 생성(소문자·하이픈). 비ASCII 뿐이면 무작위 접미로.
// 충돌 시 -2, -3 … 을 붙여 유일화(작은 테이블이라 조회 후 결정으로 충분).
const addSchema = z.object({
  name_ko: z.string().trim().min(1).max(60),
  name_en: z.string().trim().min(1).max(60),
  parentId: z.string().uuid().nullable(),
});

function slugify(en: string): string {
  const base = en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `cat-${Math.random().toString(36).slice(2, 8)}`;
}

export async function addCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "서버 설정 오류(service_role 미설정)" };

  const parsed = addSchema.safeParse({
    name_ko: String(formData.get("name_ko") || ""),
    name_en: String(formData.get("name_en") || ""),
    parentId: String(formData.get("parent_id") || "") || null,
  });
  if (!parsed.success)
    return { ok: false, message: "한글·영문 이름을 확인해주세요. (1~60자)" };
  const { name_ko, name_en, parentId } = parsed.data;

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("categories")
    .select("id, slug, parent_id, sort_order");
  const all = rows ?? [];

  // 소분류를 달 부모는 실제 대분류여야 한다(소분류 밑 3계층 방지).
  if (parentId) {
    const parent = all.find((c) => c.id === parentId);
    if (!parent) return { ok: false, message: "대분류를 찾을 수 없습니다." };
    if (parent.parent_id)
      return { ok: false, message: "소분류 아래에는 분류를 만들 수 없습니다." };
  }

  const taken = new Set(all.map((c) => c.slug));
  let slug = slugify(name_en);
  for (let n = 2; taken.has(slug); n++) slug = `${slugify(name_en)}-${n}`;

  // 정렬: 형제(같은 부모) 중 마지막 다음. 대분류 블록 번호 체계(10·20…)와
  // 자연스럽게 이어지도록 대분류는 +10, 소분류는 +1.
  const siblings = all.filter((c) => c.parent_id === parentId);
  const maxSort = Math.max(0, ...siblings.map((c) => c.sort_order ?? 0));
  const sort_order = maxSort + (parentId ? 1 : 10);

  const { error } = await supabase.from("categories").insert({
    slug,
    name_ko,
    name_en,
    parent_id: parentId,
    sort_order,
  });
  if (error) {
    console.error("[admin] 카테고리 추가 실패", slug, error);
    return { ok: false, message: "추가에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  await logAdminAction(user, {
    action: "category.create",
    targetTable: "categories",
    targetId: slug,
    meta: { name_ko, name_en, parent_id: parentId },
  });
  revalidateCategoryViews();
  return { ok: true, message: `'${name_ko}' 추가되었습니다.` };
}

// ── 숨김/노출 토글 (0036) — "제외"의 기본형. 상품 연결은 보존된다.
export async function toggleCategoryActive(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const active = String(formData.get("is_active")) === "true";
  if (!z.string().uuid().safeParse(id).success) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: !active })
    .eq("id", id);
  if (error) {
    console.error("[admin] 카테고리 숨김 토글 실패", id, error);
    return;
  }
  await logAdminAction(user, {
    action: "category.toggle_active",
    targetTable: "categories",
    targetId: id,
    meta: { is_active: !active },
  });
  revalidateCategoryViews();
}

// ── 삭제 (0036) — 하위 분류·연결 상품이 없는 빈 분류만. 페이지에서 빈 분류에만
// 버튼을 보여주지만, 렌더 이후 상품이 연결될 수 있어 서버에서 재검증한다.
export async function deleteCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "서버 설정 오류(service_role 미설정)" };

  const id = String(formData.get("id") || "");
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, message: "잘못된 요청" };

  const supabase = createAdminClient();
  const [{ count: childCount }, { count: productCount }] = await Promise.all([
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id),
  ]);
  if (childCount)
    return { ok: false, message: "하위 분류가 있어 삭제할 수 없습니다. 먼저 하위를 정리하세요." };
  if (productCount)
    return {
      ok: false,
      message: `연결된 상품 ${productCount}개가 있어 삭제할 수 없습니다. 숨김을 사용하세요.`,
    };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    console.error("[admin] 카테고리 삭제 실패", id, error);
    return { ok: false, message: "삭제에 실패했습니다. 잠시 후 다시 시도하세요." };
  }
  await logAdminAction(user, {
    action: "category.delete",
    targetTable: "categories",
    targetId: id,
  });
  revalidateCategoryViews();
  return { ok: true, message: "삭제되었습니다." };
}

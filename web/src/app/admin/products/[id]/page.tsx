import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, Panel } from "@/components/admin/ui";
import {
  ProductEditForm,
  type ProductEditValues,
} from "@/components/admin/product-edit-form";
import { leafCategoryOptions, type CategoryRow } from "../leaf-options";

// 상품 본문 수정 (대표님 지시 — 이미 올린 상품 글 수정).
// 어드민 가드는 admin/layout 의 requireAdmin. 재고·이미지는 목록 화면 담당.
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // service_role 있으면 전체(비활성 포함), 없으면 공개 읽기
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const [{ data: product }, { data: categoryRows }] = await Promise.all([
    db
      .from("products")
      .select(
        "id, name, price, category_id, is_monthly, description, material, size, care, origin",
      )
      .eq("id", id)
      .maybeSingle<ProductEditValues>(),
    db
      .from("categories")
      .select("id, name_ko, name_en, parent_id, is_active")
      .order("sort_order")
      .returns<(CategoryRow & { is_active: boolean })[]>(),
  ]);
  if (!product) notFound();

  // 선택지는 노출 중(0036) 잎 분류만. 현재 카테고리가 그 목록에 없으면
  // (하위 있는 대분류 직접 연결·숨김 분류 등) select 가 "카테고리 없음"으로
  // 폴백해 저장 시 조용히 초기화된다(CodeRabbit #261) — 현재 값을 선택지에
  // 추가해 유지되게 한다.
  const rows = categoryRows ?? [];
  const categories = leafCategoryOptions(rows.filter((c) => c.is_active));
  if (
    product.category_id &&
    !categories.some((c) => c.id === product.category_id)
  ) {
    const cur = rows.find((c) => c.id === product.category_id);
    if (cur)
      categories.push({
        id: cur.id,
        name_ko: `${cur.name_ko}${cur.is_active ? " (대분류)" : " (숨김 분류)"}`,
        name_en: cur.name_en,
      });
  }

  return (
    <>
      <PageHeader title="상품 수정" description={product.name} />
      <div className="mb-4">
        <Link
          href="/admin/products"
          className="text-xs text-wabi-fg-muted underline underline-offset-2 transition-colors hover:text-wabi-fg"
        >
          ← 상품 목록으로
        </Link>
      </div>
      <Panel className="p-6">
        <ProductEditForm product={product} categories={categories} />
      </Panel>
    </>
  );
}

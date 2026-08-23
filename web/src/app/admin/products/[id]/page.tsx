import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, Panel, SectionHeading, adminAction } from "@/components/admin/ui";
import {
  ProductEditForm,
  type ProductEditValues,
} from "@/components/admin/product-edit-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { SubmitButton } from "@/components/common/submit-button";
import {
  updateStock,
  toggleActive,
  toggleMonthly,
  deleteProduct,
} from "@/app/admin/products/actions";
import { parseOptionGroups } from "@/lib/product-options";
import { ADDON_CODES } from "@/lib/addons";
import { leafCategoryOptions, type CategoryRow } from "../leaf-options";

// DB 원본 행 — options/enabled_addons 는 jsonb 라 파싱해 ProductEditValues 로 변환.
// 관리(재고·노출·사진·삭제)에 필요한 stock·is_active·images 도 함께 읽는다.
type ProductRow = Omit<ProductEditValues, "options" | "enabledAddons"> & {
  options: unknown;
  enabled_addons: unknown;
  stock: number;
  is_active: boolean;
  images: string[] | null;
};

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

  const [{ data: row }, { data: categoryRows }] = await Promise.all([
    db
      .from("products")
      .select(
        "id, name, price, category_id, is_monthly, description, material, size, care, origin, options, enabled_addons, stock, is_active, images",
      )
      .eq("id", id)
      .maybeSingle<ProductRow>(),
    db
      .from("categories")
      .select("id, name_ko, name_en, parent_id, is_active")
      .order("sort_order")
      .returns<(CategoryRow & { is_active: boolean })[]>(),
  ]);
  if (!row) notFound();

  // jsonb → 폼 값. enabled_addons 가 배열이 아니면(구 데이터) 전체 노출로 프리필.
  const product: ProductEditValues = {
    ...row,
    options: parseOptionGroups(row.options),
    enabledAddons: Array.isArray(row.enabled_addons)
      ? ADDON_CODES.filter((c) => (row.enabled_addons as string[]).includes(c))
      : ADDON_CODES,
  };

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
      <div className="space-y-6">
        {/* 사진 관리 — 순서·삭제·편집·추가 */}
        <Panel className="p-6">
          <SectionHeading>사진 관리</SectionHeading>
          <div className="mt-3">
            <ProductImageManager
              productId={row.id}
              images={row.images ?? []}
              name={row.name}
            />
          </div>
        </Panel>

        {/* 재고·노출 — 재고 저장(재입고 알림 경로) + 월간/노출 토글 */}
        <Panel className="p-6">
          <SectionHeading>재고 · 노출</SectionHeading>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={updateStock} className="flex items-center gap-2">
              <label className="text-sm text-wabi-fg-muted">재고</label>
              <input type="hidden" name="id" value={row.id} />
              <input
                name="stock"
                type="number"
                min={0}
                defaultValue={row.stock}
                aria-label={`${row.name} 재고 수량`}
                className="w-24 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2 py-1.5 text-sm outline-none transition-colors focus:border-wabi-fg"
              />
              <SubmitButton
                pendingText="저장 중…"
                className={adminAction({ tone: "outline" })}
              >
                저장
              </SubmitButton>
            </form>

            <form action={toggleMonthly}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="is_monthly" value={String(row.is_monthly)} />
              <SubmitButton
                pendingText="변경 중…"
                className={adminAction({
                  tone: row.is_monthly ? "solid" : "outline",
                })}
              >
                {row.is_monthly ? "월간 지정됨" : "월간 지정"}
              </SubmitButton>
            </form>

            <form action={toggleActive}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="is_active" value={String(row.is_active)} />
              <SubmitButton
                pendingText="변경 중…"
                className={adminAction({
                  tone: row.is_active ? "solid" : "outline",
                })}
              >
                {row.is_active ? "노출중" : "숨김"}
              </SubmitButton>
            </form>
          </div>
        </Panel>

        {/* 본문 수정 — 이름·가격·카테고리·설명·스펙·옵션 */}
        <Panel className="p-6">
          <SectionHeading>상품 정보</SectionHeading>
          <div className="mt-3">
            <ProductEditForm product={product} categories={categories} />
          </div>
        </Panel>

        {/* 삭제 — 되돌릴 수 없음. 삭제 후 목록으로 이동(deleteProduct 가 redirect). */}
        <Panel className="border-red-200 p-6">
          <SectionHeading>상품 삭제</SectionHeading>
          <p className="mt-1 text-xs text-wabi-fg-muted">
            삭제하면 되돌릴 수 없습니다. 잠시 숨기려면 위의 &lsquo;노출중 →
            숨김&rsquo;을 사용하세요.
          </p>
          <form action={deleteProduct} className="mt-3">
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton
              pendingText="삭제 중…"
              className={adminAction({ tone: "danger" })}
            >
              상품 삭제
            </SubmitButton>
          </form>
        </Panel>
      </div>
    </>
  );
}

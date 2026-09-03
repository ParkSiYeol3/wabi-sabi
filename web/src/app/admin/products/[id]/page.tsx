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
  setSaleStatus,
  deleteProduct,
} from "@/app/admin/products/actions";
import { parseOptionGroups } from "@/lib/product-options";
import { ADDON_CODES } from "@/lib/addons";
import { leafCategoryOptions, type CategoryRow } from "../leaf-options";

// DB 원본 행 — options/enabled_addons 는 jsonb 라 파싱해 ProductEditValues 로 변환.
// 관리(재고·노출·사진·삭제)에 필요한 stock·is_active·images 도 함께 읽는다.
type ProductRow = Omit<
  ProductEditValues,
  "options" | "enabledAddons" | "stockOption" | "optionStock"
> & {
  options: unknown;
  enabled_addons: unknown;
  stock: number;
  stock_option: string | null;
  is_active: boolean;
  sold_out: boolean;
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

  const [{ data: row }, { data: categoryRows }, { data: stockRows }] =
    await Promise.all([
      db
        .from("products")
        .select(
          "id, name, price, category_id, description, material, size, care, origin, options, enabled_addons, stock, stock_option, is_active, sold_out, images",
        )
        .eq("id", id)
        .maybeSingle<ProductRow>(),
      db
        .from("categories")
        .select("id, name_ko, name_en, parent_id, is_active")
        .order("sort_order")
        .returns<(CategoryRow & { is_active: boolean })[]>(),
      // 옵션 값별 재고(0058) — 폼 프리필용.
      db
        .from("product_option_stock")
        .select("value, stock")
        .eq("product_id", id)
        .returns<{ value: string; stock: number }[]>(),
    ]);
  if (!row) notFound();

  // jsonb → 폼 값. enabled_addons 가 배열이 아니면(구 데이터) 전체 노출로 프리필.
  const product: ProductEditValues = {
    ...row,
    options: parseOptionGroups(row.options),
    enabledAddons: Array.isArray(row.enabled_addons)
      ? ADDON_CODES.filter((c) => (row.enabled_addons as string[]).includes(c))
      : ADDON_CODES,
    stockOption: row.stock_option,
    optionStock: Object.fromEntries(
      (stockRows ?? []).map((r) => [r.value, r.stock]),
    ),
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
              key={(row.images ?? []).join("|")}
              productId={row.id}
              images={row.images ?? []}
              name={row.name}
            />
          </div>
        </Panel>

        {/* 재고·공개 — 재고 저장(재입고 알림 경로) + 판매 상태 3버튼 */}
        <Panel className="p-6">
          <SectionHeading>재고 · 공개</SectionHeading>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {row.stock_option ? (
              // 옵션 값별 재고 관리 상품(0058) — flat 재고는 값별 합이라 여기서 직접
              // 편집하지 않는다. 값별 수량은 아래 '옵션'에서 수정한다.
              <p className="text-sm text-wabi-fg-muted">
                재고{" "}
                <span className="font-medium text-wabi-fg">
                  옵션 ‘{row.stock_option}’ 값별 관리 중
                </span>{" "}
                (합계 {row.stock}개 · 아래 옵션에서 수정)
              </p>
            ) : (
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
            )}

            {/* 판매 상태 3버튼(대표님) — 공개 / 비공개 / 품절. 현재 상태는 채워진
                버튼으로 표시. 품절은 저장된 재고 수량과 무관하게 강제 품절. */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "public", label: "공개" },
                  { key: "private", label: "비공개" },
                  { key: "soldout", label: "품절" },
                ] as const
              ).map((s) => {
                const currentStatus = !row.is_active
                  ? "private"
                  : row.sold_out
                    ? "soldout"
                    : "public";
                const active = s.key === currentStatus;
                return (
                  <form key={s.key} action={setSaleStatus}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value={s.key} />
                    <SubmitButton
                      pendingText="변경 중…"
                      className={adminAction({
                        tone: active ? "solid" : "outline",
                      })}
                    >
                      {s.label}
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
          </div>
          {/* 세 상태 안내(대표님). 품절은 재고 수량을 바꾸지 않고 강제로 잠근다 —
              재고 데이터 보존. */}
          <p className="mt-3 text-xs leading-relaxed text-wabi-fg-muted">
            <b>공개</b> — 손님에게 정상 노출·판매. <b>비공개</b> — 손님 화면·검색에서
            완전히 감춰짐(관리 목록엔 그대로 남아 판매 기록 확인 가능). <b>품절</b> —
            노출은 하되 ‘Out of Stock’으로 표시되고 구매 불가(저장된 재고 수량은 그대로
            보존). 재고가 1개 남으면 자동으로 품절 처리됩니다(매장 비치용 1개 확보).
          </p>
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
            삭제하면 되돌릴 수 없습니다. 잠시 감추려면 위의 &lsquo;공개중 →
            비공개&rsquo;를 사용하세요.
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

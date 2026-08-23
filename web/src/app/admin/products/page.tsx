import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { AddonImageField } from "@/components/admin/addon-image-field";
import { ProductGridCard } from "@/components/admin/product-grid-card";
import { ADDONS } from "@/lib/addons";
import { getSiteContent, addonImageKey } from "@/lib/queries/content";
import { PageHeader, SectionHeading, EmptyState } from "@/components/admin/ui";

import { leafCategoryOptions, type CategoryRow } from "./leaf-options";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  is_monthly: boolean;
  images: string[] | null;
};

export default async function AdminProductsPage() {
  // service_role 있으면 전체(비활성 포함), 없으면 공개 읽기
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: products } = await db
    .from("products")
    .select("id, name, price, stock, is_active, is_monthly, images")
    .order("created_at", { ascending: false })
    .returns<Product[]>();

  // 숨김 분류(0036)는 새 상품 연결 선택지에서 제외.
  const { data: categoryRows } = await db
    .from("categories")
    .select("id, name_ko, name_en, parent_id")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  // 잎 카테고리 선택지 — 수정 페이지와 공용(leaf-options.ts)
  const categories = leafCategoryOptions(categoryRows ?? []);

  // 추가 옵션(애드온) 사진 — 전역 공통. 상품 관리 화면에서 바로 넣게(대표님).
  const addonImages = await Promise.all(
    ADDONS.map((a) => getSiteContent(addonImageKey(a.code))),
  );

  return (
    <>
      <PageHeader title="상품 관리" description="상품 등록·재고·노출·삭제." />

      <div className="space-y-10">
        {/* 목록 — 대표님: 페이지 진입 시 수정할 상품 목록이 맨 위에 먼저 보이게.
            등록 폼·애드온 사진은 목록 아래로 내린다. */}
        <section>
          <SectionHeading>상품 목록 ({products?.length ?? 0})</SectionHeading>
          {/* 카드를 누르면 수정 페이지로(대표님) — 재고·사진·삭제 등 관리는 거기서.
              모바일에서 한 화면에 여러 개 보이도록 2열(→3·4열). */}
          <p className="mt-1 text-xs leading-relaxed text-wabi-fg-muted">
            상품 카드를 누르면 수정 페이지가 열립니다. 재고·사진 순서·삭제 등 모든
            관리는 수정 페이지에서 합니다.
          </p>
          {!products?.length ? (
            <div className="mt-3">
              <EmptyState>등록된 상품이 없습니다.</EmptyState>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductGridCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* 새 상품 — 접이식·목록 아래(대표님): 수정 목록이 먼저 보이고, '새 상품
            등록'을 눌러야 폼이 펼쳐진다. 폼은 클라이언트 컴포넌트라 접힌 상태에서도
            마운트를 유지(입력값 보존). */}
        <details className="group rounded-lg border border-wabi-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-wabi-fg marker:content-none">
            <span aria-hidden className="text-lg leading-none text-wabi-accent">
              ＋
            </span>
            새 상품 등록
            <span className="ml-auto text-xs font-normal text-wabi-fg-muted">
              <span className="group-open:hidden">눌러서 펼치기</span>
              <span className="hidden group-open:inline">접기</span>
            </span>
          </summary>
          <div className="border-t border-wabi-border px-4 pt-2 pb-5">
            <ProductCreateForm categories={categories ?? []} />
          </div>
        </details>

        {/* 추가 옵션(애드온) 사진 — 상품 상세 "추가 옵션" 옆 썸네일. 전역 공통이라
            한 번 올리면 모든 상품에 함께 적용된다(대표님). */}
        <section>
          <SectionHeading>추가 옵션 사진</SectionHeading>
          <p className="mt-1 text-xs leading-relaxed text-wabi-fg-muted">
            상품 상세의 “추가 옵션”(선물 포장·쇼핑백) 옆에 작은 사진으로
            표시됩니다. <b>모든 상품 공통</b>이며, 정사각형으로 잘려 보이니 가운데
            오도록 올려주세요.
          </p>
          <div className="mt-3 max-w-xl space-y-3">
            {ADDONS.map((a, i) => (
              <AddonImageField
                key={a.code}
                code={a.code}
                label={`${a.name} (+${won(a.price)})`}
                current={addonImages[i] ?? null}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

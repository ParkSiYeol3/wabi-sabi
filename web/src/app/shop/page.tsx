import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Search } from "lucide-react";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Reveal } from "@/components/reveal";
import { Input } from "@/components/ui/input";
import { categoryTree, MONTHLY_SLUG } from "@/lib/site";
import { ShopSidebar } from "@/components/shop-sidebar";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import {
  getProducts,
  getShopBrowse,
  type ProductSort,
} from "@/lib/queries/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "WABI-SABI 수공예 도자기·생활 오브제 컬렉션",
};

const sorts: { key: ProductSort; label: string }[] = [
  { key: "newest", label: "신상품순" },
  { key: "price_asc", label: "낮은가격순" },
  { key: "price_desc", label: "높은가격순" },
];

type SP = ShopSP;
const buildQuery = buildShopQuery;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort as ProductSort) || "newest";
  // 검색어가 있으면 캐시 밖(입력 무한), 없으면 캐시된 탐색 경로(카테고리×정렬 유한).
  const products = sp.q?.trim()
    ? await getProducts({ category: sp.category, q: sp.q, sort })
    : await getShopBrowse({ category: sp.category, sort });

  return (
    <Container className="py-16">
      {/* 헤더 — 타이틀 + 결과 수 */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-wide">Shop</h1>
        <span className="text-xs text-wabi-fg-muted">
          {products.length}개 상품
        </span>
      </div>

      {/* 카테고리 칩 (WSB-007) — 모바일·태블릿 전용. 데스크톱은 좌측 사이드바(#195). */}
      <nav className="mt-8 flex flex-wrap gap-2 lg:hidden" aria-label="카테고리">
        <FilterLink href={buildQuery(sp, { category: undefined })} active={!sp.category}>
          전체
        </FilterLink>
        <FilterLink
          href={buildQuery(sp, { category: MONTHLY_SLUG })}
          active={sp.category === MONTHLY_SLUG}
        >
          이 달의 상품
        </FilterLink>
        {/* 대분류 칩 — 하위 소분류까지 포함해 필터된다(#193). */}
        {categoryTree.map((c) => {
          const groupActive =
            sp.category === c.slug ||
            !!c.children?.some((ch) => ch.slug === sp.category);
          return (
            <FilterLink
              key={c.slug}
              href={buildQuery(sp, { category: c.slug })}
              active={groupActive}
              current={sp.category === c.slug}
            >
              {c.ko} {c.en}
            </FilterLink>
          );
        })}
      </nav>

      {/* 모바일 소분류 줄 — 선택된 대분류(또는 그 소분류)가 있을 때만 */}
      {(() => {
        const node = categoryTree.find(
          (c) =>
            c.children &&
            (c.slug === sp.category ||
              c.children.some((ch) => ch.slug === sp.category)),
        );
        if (!node?.children) return null;
        return (
          <nav
            className="mt-3 flex flex-wrap gap-2 lg:hidden"
            aria-label={`${node.ko} 소분류`}
          >
            <FilterLink
              href={buildQuery(sp, { category: node.slug })}
              active={sp.category === node.slug}
            >
              {node.ko} 전체
            </FilterLink>
            {node.children.map((ch) => (
              <FilterLink
                key={ch.slug}
                href={buildQuery(sp, { category: ch.slug })}
                active={sp.category === ch.slug}
              >
                {ch.ko}
              </FilterLink>
            ))}
          </nav>
        );
      })()}

      <div className="mt-8 flex items-start gap-10">
        {/* 데스크톱 좌측 사이드바 — 소분류 토글 (#195, biomedium 참고) */}
        <div className="hidden lg:block">
          <ShopSidebar sp={sp} />
        </div>

        <div className="min-w-0 flex-1">
      {/* 툴바 — 검색(좌) + 정렬(우) 한 줄, 하단 구분선 */}
      <div className="flex flex-col gap-4 border-b border-wabi-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        {/* 검색 (WSB-008) — next/form 으로 클라이언트 내비게이션(전체 새로고침 방지) */}
        <Form
          action="/shop"
          role="search"
          className="flex w-full gap-2 sm:max-w-xs"
        >
          {sp.category && (
            <input type="hidden" name="category" value={sp.category} />
          )}
          {sp.sort && sp.sort !== "newest" && (
            <input type="hidden" name="sort" value={sp.sort} />
          )}
          <Input
            name="q"
            type="search"
            defaultValue={sp.q ?? ""}
            placeholder="상품 검색"
            aria-label="상품 검색"
            className="rounded-none"
          />
          <button
            type="submit"
            aria-label="검색"
            className="flex items-center justify-center bg-wabi-accent px-4 text-white hover:bg-wabi-accent/90"
          >
            <Search className="size-4" />
          </button>
        </Form>

        {/* 정렬 (WSB-009) */}
        <div className="flex shrink-0 gap-4 text-xs">
          {sorts.map((s) => (
            <Link
              key={s.key}
              href={buildQuery(sp, { sort: s.key })}
              aria-current={sort === s.key ? "true" : undefined}
              className={cn(
                "transition-colors",
                sort === s.key
                  ? "font-medium text-wabi-fg"
                  : "text-wabi-fg-muted hover:text-wabi-fg",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-16 pb-10 text-center text-sm text-wabi-fg-muted">
          {sp.q ? `'${sp.q}' 검색 결과가 없습니다.` : "준비 중인 상품입니다."}
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {products.map((p, i) => {
            const card = (
              <>
                {/* 첫 줄(모바일 2·데스크톱 4칸)은 eager 로드 — LCP 후보 */}
                <ProductCard product={p} eager={i < 4} />
                <AddToCartButton
                  product={{
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image: p.image,
                  }}
                  soldOut={typeof p.stock === "number" && p.stock <= 0}
                  className="mt-3 w-full"
                />
              </>
            );
            return (
              <li key={p.id}>
                {/* 첫 행은 LCP 보호를 위해 즉시 표시, 이후 행만 스크롤 진입 애니메이션 */}
                {i < 4 ? (
                  card
                ) : (
                  <Reveal
                    variant="scale"
                    delay={([0, 100, 200, 300] as const)[i % 4] ?? 0}
                  >
                    {card}
                  </Reveal>
                )}
              </li>
            );
          })}
        </ul>
      )}
        </div>
      </div>
    </Container>
  );
}

function FilterLink({
  href,
  active,
  current = active,
  children,
}: {
  href: string;
  /** 시각적 강조(그룹 활성 포함) */
  active: boolean;
  /** 정확히 현재 필터인 링크만 aria-current — 기본은 active 와 동일 */
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={cn(
        "border px-4 py-1.5 text-xs transition-colors",
        active
          ? "border-wabi-fg text-wabi-fg"
          : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg",
      )}
    >
      {children}
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/common/reveal";
import { ShopSidebar } from "@/components/shop/shop-sidebar";
import { MobileCategoryTabs } from "@/components/shop/mobile-category-tabs";
import { FeaturedShortcuts } from "@/components/shop/featured-shortcuts";
import { SortSelect } from "@/components/shop/sort-select";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { type ShopSP } from "@/lib/shop-url";
import {
  getProducts,
  getShopBrowse,
  type ProductSort,
} from "@/lib/queries/products";
import { getCategoryTree } from "@/lib/queries/categories";

export const metadata: Metadata = {
  title: "상품",
  description:
    "와비사비가 고른 기물과 오브제. 접시·볼·컵·다기부터 액세서리·생활소품까지, 오래 곁에 두고 싶은 기물을 큐레이션합니다.",
};

const sorts: { key: ProductSort; label: string }[] = [
  { key: "newest", label: "신상품순" },
  { key: "popular", label: "주문 많은 순" },
  { key: "likes", label: "좋아요순" },
];

type SP = ShopSP;

// 한 페이지 상품 수(대표님 — 페이지 구분). 4열 그리드 기준 3행.
const PAGE_SIZE = 12;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort as ProductSort) || "newest";
  const query = sp.q?.trim();
  // 카테고리 트리(이름은 DB 편집값 #246) — 상품 조회와 병렬.
  const [tree, products] = await Promise.all([
    getCategoryTree(),
    query
      ? getProducts({ category: sp.category, q: sp.q, sort })
      : getShopBrowse({ category: sp.category, sort }),
  ]);

  // 검색 결과가 없으면 이탈하지 않게 최신 상품을 추천한다(갭 분석 4). 캐시된
  // 탐색 쿼리 재사용 — 검색 실패 시에만 실행하므로 정상 경로엔 부하가 없다.
  const suggestions =
    products.length === 0 && query
      ? (await getShopBrowse({ sort: "newest" })).slice(0, 4)
      : [];

  // 페이지네이션(대표님) — 목록은 캐시된 전체를 여기서 슬라이스한다. 범위를 벗어난
  // page 는 마지막 페이지로 클램프. 필터/정렬을 바꾸면 buildShopQuery 가 page 를
  // 떨궈 1페이지로 리셋된다.
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageNum = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  const paged = products.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  // 페이지 타이틀 = 선택 카테고리명(영어 — shop 분류 영어화, 대표님). name_en 우선,
  // 대분류("-")·미매칭이면 name_ko(대분류는 TABLEWARE·OBJECTS 라 그대로 영문). 전체는
  const activeNode =
    tree.find((n) => n.slug === sp.category) ??
    tree.flatMap((n) => n.children ?? []).find((c) => c.slug === sp.category);
  const catHeading = activeNode
    ? activeNode.en?.trim() && activeNode.en !== "-"
      ? activeNode.en
      : activeNode.ko
    : undefined;
  const heading = !sp.category ? "Shop" : (catHeading ?? "Shop");

  return (
    <Container className="pb-16 pt-2 sm:pt-3">
      {/* 특색 대분류(대표님) — 오늘의 와비사비. 헤더 구분선에 거의 붙게
          상단 여백 최소화. 아래 여백은 모바일에서 특히 축소(대표님). */}
      <FeaturedShortcuts className="mb-3.5 sm:mb-7" />

      {/* 헤더 — 타이틀 ("N개 상품" 표기는 대표님 요청으로 제거). 글씨 축소(대표님) */}
      <h1 className="text-lg font-semibold tracking-wide sm:text-xl">{heading}</h1>

      {/* 카테고리 — 대표님: 웹·모바일 모두 전 분류가 보이게. 모바일·태블릿(<lg)은
          카테고리 나열 + 정렬 드롭다운을 한 줄에 둔다(대표님 — 정렬이 아래로 떨어져
          생기던 빈 공간 제거·정렬을 위로). 데스크톱은 좌측 사이드바 + 우측 툴바 정렬. */}
      <div className="flex items-start justify-between gap-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <MobileCategoryTabs sp={sp} tree={tree} />
        </div>
        <div className="mt-3 shrink-0 sm:mt-6">
          <SortSelect sp={sp} sort={sort} options={sorts} />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-10 sm:mt-8">
        {/* 데스크톱 좌측 사이드바 — 소분류 토글 (#195, biomedium 참고) */}
        <div className="hidden lg:block">
          <ShopSidebar sp={sp} tree={tree} />
        </div>

        <div className="min-w-0 flex-1">
          {/* 데스크톱 툴바 — 정렬만 우측 정렬(모바일은 위 카테고리 줄로 올림). 구분선
              제거(대표님 — 선 없는 게 담백). 검색창도 제거(웹·모바일 모두 노출 안 함).
              직접 검색이 필요하면 ?q= URL 파라미터는 계속 동작한다(빈 결과 시 추천 노출). */}
          <div className="hidden items-center justify-end pb-5 lg:flex">
            <SortSelect sp={sp} sort={sort} options={sorts} />
          </div>

          {products.length === 0 ? (
            <div className="mt-16 pb-10">
              <p className="text-center text-sm text-wabi-fg-muted">
                {query
                  ? `'${sp.q}' 검색 결과가 없습니다.`
                  : "준비 중인 상품입니다."}
              </p>
              {query && (
                <p className="mt-3 text-center">
                  <Link
                    href="/shop"
                    className="text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
                  >
                    전체 상품 보기 →
                  </Link>
                </p>
              )}
              {suggestions.length > 0 && (
                <section className="mt-14">
                  <h2 className="text-center text-sm font-medium">
                    이런 상품은 어떠세요?
                  </h2>
                  <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:gap-y-10 md:grid-cols-4">
                    {suggestions.map((p) => (
                      <li key={p.id}>
                        <ProductCard product={p} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <ul className="mt-1 grid grid-cols-2 gap-x-6 gap-y-7 sm:mt-10 sm:gap-y-10 md:grid-cols-4">
              {paged.map((p, i) => {
                {
                  /* 담기는 상세 페이지에서(#252, 대표님 시안 — 옵션 선택 후 담기). 카드는 상세로 유도만. */
                }
                const card = <ProductCard product={p} eager={i < 4} />;
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

          {/* 페이지 구분(대표님 — < 1 2 3 … >). 검색어 없는 목록에만, 2쪽 이상일 때. */}
          {products.length > 0 && (
            <ShopPagination sp={sp} page={pageNum} totalPages={totalPages} />
          )}
        </div>
      </div>
    </Container>
  );
}

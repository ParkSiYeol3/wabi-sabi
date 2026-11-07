import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/common/reveal";
import { ShopSidebar } from "@/components/shop/shop-sidebar";
import { MobileCategoryTabs } from "@/components/shop/mobile-category-tabs";
import { FeaturedShortcuts } from "@/components/shop/featured-shortcuts";
import { SortSelect } from "@/components/shop/sort-select";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { getShopBrowse, type ProductSort } from "@/lib/queries/products";
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
  const sort = sorts.some((s) => s.key === sp.sort)
    ? (sp.sort as ProductSort)
    : "newest";
  // 카테고리 트리(이름은 DB 편집값 #246) — 상품 조회와 병렬. 검색(?q=)은 next.config
  // 리다이렉트로 /search 가 맡는다(2026-11-08).
  const [tree, products] = await Promise.all([
    getCategoryTree(),
    getShopBrowse({ category: sp.category, sort }),
  ]);
  const sortOptions = sorts.map((s) => ({
    ...s,
    href: buildShopQuery(sp, { sort: s.key }),
  }));

  // 페이지네이션(대표님) — 목록 전체를 여기서 슬라이스한다. 범위를 벗어난
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
    <Container className="pb-16 pt-3">
      {/* 헤더 — 타이틀과 특색 필을 같은 선상에(대표님 2026-09-08). 필이 둘이라
          좁은 화면에선 한 줄에 다 못 들어가므로 flex-wrap 으로 넘기고 ml-auto 로
          오른쪽에 붙여 둔다(넘어가도 오른쪽 정렬 유지). 아래로는 필→정렬→상품카드
          간격을 같은 값으로 맞춘다 — 대표님이 요청한 "같은 거리".
          ("N개 상품" 표기는 이전에 제거, 글씨 축소도 대표님) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-wide sm:text-xl">
          {heading}
        </h1>
        <FeaturedShortcuts className="ml-auto shrink-0" />
      </div>

      {/* 카테고리 — 대표님: 웹·모바일 모두 전 분류가 보이게. 모바일·태블릿(<lg)은
          카테고리 나열 + 정렬 드롭다운을 한 줄에 둔다(대표님 — 정렬이 아래로 떨어져
          생기던 빈 공간 제거·정렬을 위로). 데스크톱은 좌측 사이드바 + 우측 툴바 정렬. */}
      {/* 분류 + 정렬 — 정렬 상자를 분류 줄의 세로 가운데에 둔다. 분류가 두 줄로
          접히면서 정렬 상자 아래에만 여백이 더 생겨 "필↔정렬"과 "정렬↔상품"이
          달라 보였는데, 가운데 정렬하면 위아래가 같은 거리로 나뉜다(대표님). */}
      <div className="mt-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0 flex-1">
          {/* 컴포넌트 기본 여백(mt-3/sm:mt-6 · pb-2/sm:pb-4)은 줄 자체가 갖게 덮는다 */}
          <MobileCategoryTabs
            sp={sp}
            tree={tree}
            className="mt-0 pb-0 sm:mt-0 sm:pb-0"
          />
        </div>
        <div className="shrink-0">
          <SortSelect value={sort} options={sortOptions} />
        </div>
      </div>

      {/* 모바일은 분류 줄이 위에 있어 4px 만 덜 띄워야 "정렬↔상품"이 "필↔정렬"과
          같아진다(대표님). lg 이상은 분류 줄이 없어 제목 바로 아래라 16px 그대로. */}
      <div className="mt-3 flex items-start gap-10 lg:mt-4">
        {/* 데스크톱 좌측 사이드바 — 소분류 토글 (#195, biomedium 참고) */}
        <div className="hidden lg:block">
          <ShopSidebar sp={sp} tree={tree} />
        </div>

        <div className="min-w-0 flex-1">
          {/* 데스크톱 툴바 — 정렬만 우측 정렬(모바일은 위 카테고리 줄로 올림). 구분선
              제거(대표님 — 선 없는 게 담백). 검색창은 두지 않는다(대표님): 검색은 헤더
              돋보기 → /search 화면(2026-11-08). */}
          <div className="hidden items-center justify-end pb-5 lg:flex">
            <SortSelect value={sort} options={sortOptions} />
          </div>

          {products.length === 0 ? (
            <div className="mt-16 pb-10">
              <p className="text-center text-sm text-wabi-fg-muted">
                준비 중인 상품입니다.
              </p>
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

          {/* 페이지 구분(대표님 — < 1 2 3 … >). 2쪽 이상일 때. */}
          {products.length > 0 && (
            <ShopPagination
              page={pageNum}
              totalPages={totalPages}
              linkFor={(n) => buildShopQuery(sp, { page: String(n) })}
            />
          )}
        </div>
      </div>
    </Container>
  );
}

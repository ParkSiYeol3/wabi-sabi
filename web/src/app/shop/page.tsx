import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/common/reveal";
import { MONTHLY_SLUG } from "@/lib/site";
import { ShopSidebar } from "@/components/shop/shop-sidebar";
import { MobileCategoryTabs } from "@/components/shop/mobile-category-tabs";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import {
  getProducts,
  getShopBrowse,
  type ProductSort,
} from "@/lib/queries/products";
import { getCategoryTree } from "@/lib/queries/categories";
import { cn } from "@/lib/utils";

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
const buildQuery = buildShopQuery;

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

  // 페이지 타이틀 = 선택 카테고리명(영어 — shop 분류 영어화, 대표님). name_en 우선,
  // 대분류("-")·미매칭이면 name_ko(대분류는 TABLEWARE·OBJECTS 라 그대로 영문). 전체는
  // "Shop", 이 달의 상품만 한글 유지(대표님 — 이 달·오늘의는 영어화 제외).
  const activeNode =
    tree.find((n) => n.slug === sp.category) ??
    tree.flatMap((n) => n.children ?? []).find((c) => c.slug === sp.category);
  const catHeading = activeNode
    ? activeNode.en?.trim() && activeNode.en !== "-"
      ? activeNode.en
      : activeNode.ko
    : undefined;
  const heading = !sp.category
    ? "Shop"
    : sp.category === MONTHLY_SLUG
      ? "이 달의 상품"
      : (catHeading ?? "Shop");

  return (
    <Container className="pb-16 pt-24">
      {/* 헤더 — 타이틀 ("N개 상품" 표기는 대표님 요청으로 제거) */}
      <h1 className="text-2xl font-semibold tracking-wide">{heading}</h1>

      {/* 카테고리 — 대표님: 웹·모바일 모두 전 분류가 보이게. 모바일·태블릿(<lg)은
          이 그룹 나열(대분류+소분류 텍스트, 누르면 필터), 데스크톱은 좌측 사이드바. */}
      <MobileCategoryTabs sp={sp} tree={tree} />

      <div className="mt-8 flex items-start gap-10">
        {/* 데스크톱 좌측 사이드바 — 소분류 토글 (#195, biomedium 참고) */}
        <div className="hidden lg:block">
          <ShopSidebar sp={sp} tree={tree} />
        </div>

        <div className="min-w-0 flex-1">
          {/* 툴바 — 정렬만 우측 정렬. 구분선 제거(대표님 — 선 없는 게 담백). 검색창도
              제거(웹·모바일 모두 노출 안 함). 카테고리 탐색은 사이드바/드로어가 담당하고,
              직접 검색이 필요하면 ?q= URL 파라미터는 계속 동작한다(빈 결과 시 추천 노출). */}
          <div className="flex items-center justify-end pb-5">
            {/* 정렬 — 눈에 튀지 않게 담백한 텍스트 링크(대표님: 굳이 잘 안 보여도 됨).
                선택된 정렬만 진하게, 나머지는 흐리게. 가운뎃점으로 구분. */}
            <div className="flex shrink-0 items-center gap-3 text-xs text-wabi-fg-muted">
              {sorts.map((s, i) => (
                <Fragment key={s.key}>
                  {i > 0 && (
                    <span aria-hidden className="text-wabi-border">
                      ·
                    </span>
                  )}
                  <Link
                    href={buildQuery(sp, { sort: s.key })}
                    aria-current={sort === s.key ? "true" : undefined}
                    className={cn(
                      "transition active:opacity-40 hover:text-wabi-fg",
                      sort === s.key && "font-medium text-wabi-fg",
                    )}
                  >
                    {s.label}
                  </Link>
                </Fragment>
              ))}
            </div>
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
                  <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
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
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {products.map((p, i) => {
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
        </div>
      </div>
    </Container>
  );
}

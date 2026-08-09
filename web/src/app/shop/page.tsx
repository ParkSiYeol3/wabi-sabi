import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import Form from "next/form";
import { Search } from "lucide-react";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/common/reveal";
import { Input } from "@/components/ui/input";
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

  // 페이지 타이틀 = 선택 카테고리명(대표님 — TABLEWARE 누르면 TABLEWARE 로).
  // 대분류 이름(name_ko)이 이미 TABLEWARE·OBJECTS 라 그대로 쓴다. 소분류는 그
  // 소분류명, 이 달의 상품·전체는 각각. 전체는 "상품"(한글=명조 폰트로 사이트와
  // 통일 — 영문 "Shop"은 라틴 Cormorant 라 홀로 튀었다, 대표님).
  const heading = !sp.category
    ? "상품"
    : sp.category === MONTHLY_SLUG
      ? "이 달의 상품"
      : (tree.find((n) => n.slug === sp.category)?.ko ??
        tree
          .flatMap((n) => n.children ?? [])
          .find((c) => c.slug === sp.category)?.ko ??
        "Shop");

  return (
    <Container className="py-16">
      {/* 헤더 — 타이틀 ("N개 상품" 표기는 대표님 요청으로 제거) */}
      <h1 className="text-2xl font-semibold tracking-wide">{heading}</h1>

      {/* 카테고리 — 모바일(<md)에선 상품이 곧바로 보이도록 분류를 우측 드로어로
          옮겼다(대표님: shop 들어오면 상품 카드·정렬만). 드로어가 없는 태블릿
          (md~lg)에선 이 플랫 탭바를 유지하고, 데스크톱은 좌측 사이드바 그대로. */}
      <MobileCategoryTabs sp={sp} tree={tree} tabletOnly />

      <div className="mt-8 flex items-start gap-10">
        {/* 데스크톱 좌측 사이드바 — 소분류 토글 (#195, biomedium 참고) */}
        <div className="hidden lg:block">
          <ShopSidebar sp={sp} tree={tree} />
        </div>

        <div className="min-w-0 flex-1">
          {/* 툴바 — 검색(좌) + 정렬(우) 한 줄, 하단 구분선 */}
          <div className="flex flex-col gap-4 border-b border-wabi-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            {/* 검색 (WSB-008) — next/form 으로 클라이언트 내비게이션(전체 새로고침 방지).
                모바일은 공간 절약 위해 검색창을 숨긴다(대표님) → sm 이상만 노출. */}
            <Form
              action="/shop"
              role="search"
              className="hidden w-full gap-2 sm:flex sm:max-w-xs"
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

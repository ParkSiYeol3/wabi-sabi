import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Search, ChevronDown } from "lucide-react";
import { Container } from "@/components/container";
import { CtaLink } from "@/components/cta-link";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { Input } from "@/components/ui/input";
import { MONTHLY_SLUG } from "@/lib/site";
import { ShopSidebar } from "@/components/shop-sidebar";
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

  // 모바일 분류 드롭다운 요약에 쓸 현재 선택 라벨 — 미선택은 "전체".
  const catLabel = sp.category ? heading : "전체";

  return (
    <Container className="py-16">
      {/* 헤더 — 타이틀 + 결과 수 */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-wide">{heading}</h1>
        <span className="font-numeric text-xs text-wabi-fg-muted">
          {products.length}개 상품
        </span>
      </div>

      {/* 카테고리 (모바일·태블릿) — 드롭다운(대표님, 칩이 다 펼쳐져 난잡).
          기본 접힘, 펴면 그룹별 목록. 데스크톱은 좌측 사이드바(#195). JS 없이
          details/summary 로 동작(CSP 무관), 요약엔 현재 선택 분류를 보여준다. */}
      <details className="group mt-8 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between border border-wabi-border px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-wabi-fg-muted">분류</span>
            <span className="mx-2 text-wabi-border">·</span>
            {catLabel}
          </span>
          <ChevronDown className="size-4 shrink-0 text-wabi-fg-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 space-y-3 border border-wabi-border p-4">
          <nav className="flex flex-wrap gap-2" aria-label="카테고리">
            <FilterLink
              href={buildQuery(sp, { category: undefined })}
              active={!sp.category}
            >
              전체
            </FilterLink>
            <FilterLink
              href={buildQuery(sp, { category: MONTHLY_SLUG })}
              active={sp.category === MONTHLY_SLUG}
              accent
            >
              <span aria-hidden className="mr-1">
                ✦
              </span>
              이 달의 상품
            </FilterLink>
          </nav>

          {/* 오늘의 와비사비 — "이 달의 상품" 바로 아래(대표님) */}
          <CtaLink href="/today" label="오늘의 와비사비" />

          {tree.map((c) => (
            <nav
              key={c.slug}
              className="flex flex-wrap gap-2"
              aria-label={`${c.ko} 분류`}
            >
              {/* 그룹 전체보기 — 대분류를 칩에서 빼는 대신 "[그룹] 전체" 로 유지 */}
              <FilterLink
                href={buildQuery(sp, { category: c.slug })}
                active={sp.category === c.slug}
              >
                {c.ko} 전체
              </FilterLink>
              {c.children?.map((ch) => (
                <FilterLink
                  key={ch.slug}
                  href={buildQuery(sp, { category: ch.slug })}
                  active={sp.category === ch.slug}
                >
                  {ch.ko}
                </FilterLink>
              ))}
            </nav>
          ))}
        </div>
      </details>

      <div className="mt-8 flex items-start gap-10">
        {/* 데스크톱 좌측 사이드바 — 소분류 토글 (#195, biomedium 참고) */}
        <div className="hidden lg:block">
          <ShopSidebar sp={sp} tree={tree} />
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
        <div className="mt-16 pb-10">
          <p className="text-center text-sm text-wabi-fg-muted">
            {query ? `'${sp.q}' 검색 결과가 없습니다.` : "준비 중인 상품입니다."}
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
                이런 상품은 어떠세요
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
            {/* 담기는 상세 페이지에서(#252, 대표님 시안 — 옵션 선택 후 담기). 카드는 상세로 유도만. */}
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

function FilterLink({
  href,
  active,
  current = active,
  accent = false,
  children,
}: {
  href: string;
  /** 시각적 강조(그룹 활성 포함) */
  active: boolean;
  /** 정확히 현재 필터인 링크만 aria-current — 기본은 active 와 동일 */
  current?: boolean;
  /** 이 달의 상품처럼 특별 강조 — 액센트 색(대표님). 활성 시 채워진다. */
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={cn(
        "border px-4 py-1.5 text-xs transition-colors",
        accent
          ? active
            ? "border-wabi-accent bg-wabi-accent text-white"
            : "border-wabi-accent text-wabi-accent hover:bg-wabi-accent hover:text-white"
          : active
            ? "border-wabi-fg text-wabi-fg"
            : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg",
      )}
    >
      {children}
    </Link>
  );
}

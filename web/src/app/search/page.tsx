import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { SearchBox, type SuggestItem } from "@/components/search/search-box";
import { RecentSearches } from "@/components/search/recent-searches";
import { getCategoryTree } from "@/lib/queries/categories";
import { getPublicContent, SEARCH_KEYWORDS_KEY } from "@/lib/queries/content";
import {
  defaultKeywords,
  getSearchCatalog,
  searchCatalog,
} from "@/lib/queries/search";
import { isListingSoldOut } from "@/lib/inventory";
import {
  MAX_QUERY_LENGTH,
  PRICE_BANDS,
  SEARCH_SORTS,
  parseKeywords,
  parseSearchSort,
  priceBand,
} from "@/lib/search";
import { buildSearchQuery, type SearchSP } from "@/lib/search-url";
import { cn } from "@/lib/utils";

// 검색 화면(대표님 2026-11-08: 쇼핑몰처럼). 헤더 돋보기로 들어온다. SHOP 목록 위 검색창은
// 대표님이 빼 달라고 해서(#422) 따로 화면을 둔다.
//  - 검색어 없음: 입력칸 + 추천 검색어(관리자 콘텐츠) + 최근 검색어(이 기기)
//  - 검색어 있음: 결과 수 · 분류/가격대/품절 제외 필터 · 정렬 · 페이지 구분
// 검색 결과 주소는 색인하지 않는다(내용 없는 페이지가 무한히 생긴다).
export const metadata: Metadata = {
  title: "검색",
  robots: { index: false, follow: true },
};

const PAGE_SIZE = 12;

function catLabel(n: { ko: string; en: string }) {
  const en = n.en?.trim();
  return en && en !== "-" ? en : n.ko;
}

function Chip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs whitespace-nowrap transition-colors",
        active
          ? "border-wabi-fg bg-wabi-fg text-wabi-bg"
          : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("font-numeric lining-nums", active ? "opacity-80" : "opacity-60")}>
          {count}
        </span>
      )}
    </Link>
  );
}

function KeywordChips({
  keywords,
  className,
}: {
  keywords: string[];
  className?: string;
}) {
  return (
    <ul className={cn("mt-3 flex flex-wrap gap-2", className)}>
      {keywords.map((k) => (
        <li key={k}>
          <Link
            href={`/search?q=${encodeURIComponent(k)}`}
            className="inline-flex h-9 items-center rounded-full border border-wabi-border px-3.5 text-sm text-wabi-fg transition-colors hover:border-wabi-fg"
          >
            {k}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchSP>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, MAX_QUERY_LENGTH);
  const sort = parseSearchSort(sp.sort);
  const price = priceBand(sp.price)?.key;
  const inStock = sp.instock === "1";

  const tree = await getCategoryTree();
  const [catalog, content] = await Promise.all([
    getSearchCatalog(tree),
    getPublicContent([SEARCH_KEYWORDS_KEY]),
  ]);
  const saved = parseKeywords(content[SEARCH_KEYWORDS_KEY]);
  const keywords = saved.length ? saved : defaultKeywords(tree, catalog);

  // 자동완성용 가벼운 목록(카드에 필요한 값 + 검색 필드).
  const suggestItems: SuggestItem[] = catalog.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image ?? null,
    soldOut: isListingSoldOut(p),
    fields: p.fields,
  }));

  const leafBySlug = new Map(
    tree.flatMap((t) => [t, ...(t.children ?? [])]).map((n) => [n.slug, n]),
  );
  const category = sp.category && leafBySlug.has(sp.category) ? sp.category : undefined;
  const base: SearchSP = { q, category, price, instock: inStock ? "1" : undefined, sort };

  const result = q
    ? await searchCatalog(catalog, q, { category, price, inStock }, sort)
    : null;

  const total = result?.items.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNum = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  const paged = result?.items.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE) ?? [];
  // 결과가 없을 때 대신 보여 줄 신상품(판매 중) 4개.
  const fallback =
    result && result.matched === 0
      ? catalog.filter((p) => !isListingSoldOut(p)).slice(0, 4)
      : [];
  const filtered = !!(category || price || inStock);

  return (
    <Container className="pb-16 pt-3">
      <h1 className="text-lg font-semibold tracking-wide sm:text-xl">Search</h1>

      <div className="mx-auto mt-5 max-w-2xl">
        {/* key: 추천어·최근 검색어로 주소가 바뀌면 입력칸도 그 검색어로 새로 그린다 */}
        <SearchBox key={q} initialQuery={q} items={suggestItems} autoFocus={!q} />
      </div>

      {!result ? (
        <div className="mx-auto mt-10 max-w-2xl space-y-10">
          {keywords.length > 0 && (
            <section aria-labelledby="search-keywords">
              <h2 id="search-keywords" className="text-sm font-medium text-wabi-fg">
                추천 검색어
              </h2>
              <KeywordChips keywords={keywords} />
            </section>
          )}
          <RecentSearches />
        </div>
      ) : result.matched === 0 ? (
        <div className="mx-auto mt-14 max-w-2xl pb-6 text-center">
          <p className="break-keep text-sm text-wabi-fg">
            &lsquo;{q}&rsquo;에 맞는 상품이 없습니다.
          </p>
          <p className="mt-2 break-keep text-xs text-wabi-fg-muted">
            검색어를 줄이거나 다른 말로 찾아보세요.
          </p>
          {keywords.length > 0 && (
            <KeywordChips keywords={keywords} className="mt-6 justify-center" />
          )}
          {fallback.length > 0 && (
            <section className="mt-14 text-left">
              <h2 className="text-center text-sm font-medium">이런 상품은 어떠세요?</h2>
              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:gap-y-10 md:grid-cols-4">
                {fallback.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between gap-3">
            <p className="min-w-0 break-keep text-sm text-wabi-fg-muted">
              <span className="text-wabi-fg">&lsquo;{q}&rsquo;</span> 검색 결과{" "}
              <span className="font-numeric lining-nums text-wabi-fg">{total}</span>개
            </p>
            <div className="shrink-0">
              <SortSelect
                value={sort}
                options={SEARCH_SORTS.map((s) => ({
                  ...s,
                  href: buildSearchQuery(base, { sort: s.key }),
                }))}
              />
            </div>
          </div>

          {/* 필터: 가로로 밀어 보는 한 줄씩(휴대폰). 수는 다른 필터를 그대로 둔 채 이 칸을 고를 때의 개수. */}
          <div className="mt-4 space-y-2">
            <div
              role="group"
              aria-label="분류"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Chip
                href={buildSearchQuery(base, { category: undefined })}
                active={!category}
                count={result.categoryFacets.reduce((s, f) => s + f.count, 0)}
              >
                전체
              </Chip>
              {result.categoryFacets
                .map((f) => ({ ...f, node: leafBySlug.get(f.key) }))
                .filter((f) => f.node)
                .map((f) => (
                  <Chip
                    key={f.key}
                    href={buildSearchQuery(base, {
                      category: f.key === category ? undefined : f.key,
                    })}
                    active={f.key === category}
                    count={f.count}
                  >
                    {catLabel(f.node!)}
                  </Chip>
                ))}
            </div>
            <div
              role="group"
              aria-label="가격대·재고"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {/* 자주 쓰는 토글이라 휴대폰에서 밀지 않아도 보이게 맨 앞 */}
              {(result.soldOutCount > 0 || inStock) && (
                <Chip
                  href={buildSearchQuery(base, { instock: inStock ? undefined : "1" })}
                  active={inStock}
                >
                  품절 제외
                </Chip>
              )}
              {PRICE_BANDS.map((b) => {
                const n = result.priceFacets.find((f) => f.key === b.key)?.count ?? 0;
                if (n === 0 && price !== b.key) return null;
                return (
                  <Chip
                    key={b.key}
                    href={buildSearchQuery(base, {
                      price: price === b.key ? undefined : b.key,
                    })}
                    active={price === b.key}
                    count={n}
                  >
                    {b.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          {total === 0 ? (
            <div className="mt-14 text-center">
              <p className="text-sm text-wabi-fg-muted">조건에 맞는 상품이 없습니다.</p>
              {filtered && (
                <Link
                  href={buildSearchQuery({ q, sort }, {})}
                  className="mt-3 inline-block text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
                >
                  필터 모두 해제
                </Link>
              )}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7 sm:mt-8 sm:gap-y-10 md:grid-cols-4">
              {paged.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} eager={i < 4} />
                </li>
              ))}
            </ul>
          )}

          <ShopPagination
            page={pageNum}
            totalPages={totalPages}
            linkFor={(n) => buildSearchQuery(base, { page: String(n) })}
          />
        </>
      )}
    </Container>
  );
}

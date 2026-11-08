import { createPublicClient } from "@/lib/supabase/public";
import { applyRank, rankBy } from "@/lib/queries/products";
import { isListingSoldOut, soldOutLast } from "@/lib/inventory";
import type { CategoryNode } from "@/lib/site";
import type { ProductCardData } from "@/components/product/product-card";
import {
  inPriceBand,
  prepareFields,
  scoreProduct,
  tokenize,
  PRICE_BANDS,
  type SearchFields,
  type SearchSort,
} from "@/lib/search";

// /search 데이터(대표님 2026-11-08: 쇼핑몰처럼 검색). 판매 중 상품 전체(수십 개)를 한 번
// 읽어 lib/search 규칙으로 거른다. 같은 목록을 자동완성용으로 브라우저에도 넘긴다.

export type SearchItem = ProductCardData & {
  categorySlug: string | null;
  fields: SearchFields;
};

type Row = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold_out: boolean;
  same_day: boolean;
  images: unknown;
  material: string | null;
  origin: string | null;
  categories: { slug: string; name_ko: string; name_en: string } | null;
};

function imageAt(images: unknown, i: number): string | null {
  return Array.isArray(images) && typeof images[i] === "string" ? images[i] : null;
}

export async function getSearchCatalog(tree: CategoryNode[]): Promise<SearchItem[]> {
  // 소분류 slug → 대분류(TABLEWARE 등). "테이블웨어"로 쳐도 그 아래 상품이 나오게.
  const parentOf = new Map<string, CategoryNode>();
  for (const top of tree) for (const c of top.children ?? []) parentOf.set(c.slug, top);

  const db = createPublicClient();
  const { data, error } = await db
    .from("products")
    .select(
      "id, name, price, stock, sold_out, same_day, images, material, origin, categories(slug, name_ko, name_en)",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error || !data) {
    if (error) console.error("[search] 상품 조회 실패", error);
    return [];
  }

  return data.map((p) => {
    const parent = p.categories ? parentOf.get(p.categories.slug) : undefined;
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      sold_out: p.sold_out,
      same_day: p.same_day,
      image: imageAt(p.images, 0),
      image2: imageAt(p.images, 1),
      category: p.categories?.name_en,
      categorySlug: p.categories?.slug ?? null,
      fields: {
        name: p.name,
        material: p.material,
        origin: p.origin,
        categoryKo: p.categories?.name_ko,
        categoryEn: p.categories?.name_en,
        parentKo: parent?.ko,
        parentEn: parent?.en,
      },
    };
  });
}

export type SearchFilters = {
  category?: string;
  price?: string;
  inStock: boolean;
};

export type Facet = { key: string; count: number };

export type SearchResult = {
  items: SearchItem[];
  // 검색어에 맞는 전체 수(필터 전). 0 이면 "결과 없음".
  matched: number;
  // 다른 필터는 그대로 두고 이 칸만 바꿨을 때의 개수(쇼핑몰 필터처럼).
  categoryFacets: Facet[];
  priceFacets: Facet[];
  soldOutCount: number;
};

export async function searchCatalog(
  catalog: SearchItem[],
  q: string,
  filters: SearchFilters,
  sort: SearchSort,
): Promise<SearchResult> {
  const tokens = tokenize(q);
  const scored = catalog
    .map((item) => ({ item, score: scoreProduct(prepareFields(item.fields), tokens) }))
    .filter((r) => r.score > 0);

  const passCategory = (it: SearchItem) =>
    !filters.category || it.categorySlug === filters.category;
  const passPrice = (it: SearchItem) => inPriceBand(it.price, filters.price);
  const passStock = (it: SearchItem) => !filters.inStock || !isListingSoldOut(it);

  const byCategory = new Map<string, number>();
  for (const { item } of scored)
    if (item.categorySlug && passPrice(item) && passStock(item))
      byCategory.set(item.categorySlug, (byCategory.get(item.categorySlug) ?? 0) + 1);
  const categoryFacets = [...byCategory].map(([key, n]) => ({ key, count: n }));
  const priceFacets = PRICE_BANDS.map((b) => ({
    key: b.key,
    count: scored.filter(
      ({ item }) =>
        passCategory(item) && passStock(item) && inPriceBand(item.price, b.key),
    ).length,
  }));
  const soldOutCount = scored.filter(
    ({ item }) => passCategory(item) && passPrice(item) && isListingSoldOut(item),
  ).length;

  let rows = scored.filter(
    ({ item }) => passCategory(item) && passPrice(item) && passStock(item),
  );

  // 정렬. catalog 가 신상품순이라 같은 점수·같은 값은 신상품이 앞(안정 정렬).
  if (sort === "relevance") rows = [...rows].sort((a, b) => b.score - a.score);
  else if (sort === "price_asc") rows = [...rows].sort((a, b) => a.item.price - b.item.price);
  else if (sort === "price_desc") rows = [...rows].sort((a, b) => b.item.price - a.item.price);
  let items = rows.map((r) => r.item);
  if (sort === "popular" || sort === "likes") {
    const rank = await rankBy(
      createPublicClient(),
      items.map((i) => i.id),
      sort === "popular" ? "order_count" : "like_count",
    );
    items = applyRank(items, rank);
  }

  return {
    // 어느 정렬이든 품절은 뒤로(대표님 2026-11-07).
    items: soldOutLast(items),
    matched: scored.length,
    categoryFacets,
    priceFacets,
    soldOutCount,
  };
}

// 추천 검색어 기본값(관리자가 아직 안 정했을 때): 판매 중 상품이 2개 이상인 소분류 한글 이름, 분류
// 순서대로. 1개뿐인 분류(쇼핑백 등)는 추천으로 어색해서 뺀다(11/08 점검).
export function defaultKeywords(tree: CategoryNode[], catalog: SearchItem[]): string[] {
  const count = new Map<string, number>();
  // 판매 중 상품만 센다(품절뿐인 분류를 추천하지 않게, CodeRabbit #909).
  for (const c of catalog)
    if (c.categorySlug && !isListingSoldOut(c))
      count.set(c.categorySlug, (count.get(c.categorySlug) ?? 0) + 1);
  return tree
    .flatMap((top) => top.children ?? [])
    .filter((c) => (count.get(c.slug) ?? 0) >= 2)
    .map((c) => c.ko.trim())
    .filter(Boolean)
    .slice(0, 12);
}

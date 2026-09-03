import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategorySlugs } from "@/lib/queries/categories";
import type { ProductCardData } from "@/components/product/product-card";
import type { OptionGroup } from "@/lib/product-options";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold_out: boolean;
  images: unknown;
  categories: { slug: string; name_en: string } | null;
};

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

// 두 번째 사진(카드 hover 교차용) — 없으면 null.
function secondImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[1] === "string"
    ? images[1]
    : null;
}


// (getRelatedProducts·getProduct 는 상세 캐시 번들(#181 product-detail.ts)로
//  대체돼 소비처가 없어져 제거 — #207. ProductDetail 타입은 번들이 계속 쓴다.)

export interface ProductDetail {
  id: string;
  name: string;
  price: number;
  stock: number;
  // 강제 품절(대표님) — 재고와 무관하게 품절 처리. soldOut = stock<=0 || sold_out.
  sold_out: boolean;
  description: string | null;
  material: string | null;
  size: string | null;
  care: string | null;
  // 원산지 (0035, 대표님 지시) — 상품정보고시 항목. 없으면 표시 생략.
  origin: string | null;
  images: string[];
  category: { slug: string; name_en: string; name_ko: string } | null;
  // 상품별 커스텀 옵션(색상·모양 등, 0048) — 손님이 상세에서 선택.
  options: OptionGroup[];
  // 이 상품 상세에 노출할 추가옵션 코드(0048) — enabledAddons() 로 Addon[] 변환.
  enabledAddons: string[];
}


export type ProductSort = "newest" | "popular" | "likes";

// 주문/좋아요 정렬 — product_popularity 뷰(집계 숫자)에서 후보 상품의 순위를 받아
// JS 로 재정렬한다. PostgREST 는 임베드 집계 컬럼으로 order 하기 까다롭고, 카탈로그가
// 작고 캐시되므로 후처리 정렬이 간단·안전하다. anon/authenticated 모두 뷰 읽기 허용.
async function rankBy(
  db: SupabaseClient,
  ids: string[],
  col: "order_count" | "like_count",
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const { data } = await db
    .from("product_popularity")
    .select(`product_id, ${col}`)
    .in("product_id", ids)
    .returns<
      { product_id: string; order_count?: number; like_count?: number }[]
    >();
  return new Map(
    (data ?? []).map((r) => [r.product_id, (r[col] ?? 0) as number]),
  );
}

function applyRank<T extends { id: string }>(
  cards: T[],
  rank: Map<string, number>,
): T[] {
  return [...cards].sort(
    (a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0),
  );
}

export interface ProductQuery {
  category?: string;
  q?: string;
  sort?: ProductSort;
  limit?: number;
}

// WSB-007/008/009: 카테고리·검색·정렬 (공개 — RLS는 is_active=true 만 노출).
export async function getProducts({
  category,
  q,
  sort = "newest",
  limit,
}: ProductQuery = {}): Promise<ProductCardData[]> {
  const supabase = await createClient();

  const filterByCategory = !!category;

  // 카테고리 필터는 slug→id 별도 조회 대신 !inner 조인 필터로 한 번에.
  // 대분류 slug 는 하위 소분류까지 확장해 매칭한다(#193 2계층 트리).
  let query = supabase
    .from("products")
    .select(
      filterByCategory
        ? "id, name, price, stock, sold_out, images, categories!inner(slug, name_en)"
        : "id, name, price, stock, sold_out, images, categories(slug, name_en)",
    )
    .eq("is_active", true);

  if (filterByCategory)
    query = query.in("categories.slug", await getCategorySlugs(category!));
  if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);

  // 기본 정렬은 최신순. 주문/좋아요순은 집계 뷰로 후처리 재정렬한다.
  query = query.order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query.returns<ProductRow[]>();
  if (error || !data) return [];

  const cards = data.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    sold_out: p.sold_out,
    image: firstImage(p.images),
    image2: secondImage(p.images),
    category: p.categories?.name_en,
  }));
  if (sort === "popular" || sort === "likes") {
    const rank = await rankBy(
      supabase,
      cards.map((c) => c.id),
      sort === "popular" ? "order_count" : "like_count",
    );
    return applyRank(cards, rank);
  }
  return cards;
}

// /shop 탐색(검색어 없음) 전용 캐시 경로. 카테고리(약 10종)×정렬(3종)로 조합이 유한해
// unstable_cache 로 묶는다. 검색(q)은 입력이 무한해 캐시하지 않고 기존 getProducts 를 쓴다.
//
// getProducts 와 달리 슬러그→id 를 얻는 categories 룩업(별도 왕복)을 없앤다: category!inner
// 조인 + categories.slug 필터로 한 쿼리에 끝낸다(PostgREST 는 embed 필터가 부모행을 좁히려면
// inner 조인이어야 한다). 잘못된 슬러그는 매칭 카테고리가 없어 빈 배열(기존 동작과 동일).
//
// anon 클라라 빌드 프리렌더에서 실행되면 공개 env 없이 throw 하지만, /shop 은 searchParams
// prop 으로 선-dynamic 이라 빌드에서 호출되지 않는다. sitemap 이 쓰는 getProducts 는 서버
// 클라 그대로 둬 이 함정에서 분리한다.
async function loadShopBrowse(
  category: string | null,
  sort: ProductSort,
): Promise<ProductCardData[]> {
  const db = createPublicClient();
  const filterByCategory = !!category;

  const join = filterByCategory
    ? "categories!inner(slug, name_en)"
    : "categories(slug, name_en)";

  let query = db
    .from("products")
    .select(`id, name, price, stock, sold_out, images, ${join}`)
    .eq("is_active", true);

  // 대분류 slug 는 하위 소분류까지 확장해 매칭한다(#193 2계층 트리, 0036 DB 판).
  if (filterByCategory)
    query = query.in("categories.slug", await getCategorySlugs(category));

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query.returns<ProductRow[]>();
  if (error || !data) return [];

  const cards = data.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    sold_out: p.sold_out,
    image: firstImage(p.images),
    image2: secondImage(p.images),
    category: p.categories?.name_en,
  }));
  if (sort === "popular" || sort === "likes") {
    const rank = await rankBy(
      db,
      cards.map((c) => c.id),
      sort === "popular" ? "order_count" : "like_count",
    );
    return applyRank(cards, rank);
  }
  return cards;
}

const getCachedShopBrowse = unstable_cache(
  (category: string | null, sort: ProductSort) => loadShopBrowse(category, sort),
  ["shop-browse"],
  { revalidate: 120 },
);

// 어드민 상품 변경 시 revalidatePath("/shop") 로 무효화된다.
export function getShopBrowse({
  category,
  sort = "newest",
}: { category?: string; sort?: ProductSort } = {}): Promise<ProductCardData[]> {
  return getCachedShopBrowse(category ?? null, sort);
}

// (getFeaturedProducts 는 구 홈 Featured Collection 용 — 헬릭스 리디자인(#197)으로
//  소비처가 사라져 제거 — #207.)

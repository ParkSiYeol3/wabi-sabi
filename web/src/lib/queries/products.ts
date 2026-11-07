import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategorySlugs } from "@/lib/queries/categories";
import { soldOutLast } from "@/lib/inventory";
import type { ProductCardData } from "@/components/product/product-card";
import type { OptionGroup } from "@/lib/product-options";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold_out: boolean;
  same_day: boolean;
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
  // 당일발송 표시(대표님 #838). 품절이면 화면에서 숨긴다.
  same_day: boolean;
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
  // 변형 그룹(0058·0061) — 재고·가격을 값별로 관리하는 옵션 그룹 이름. 없으면 null.
  variantGroup?: string | null;
  // 그 그룹의 값별 판매가(0061, 사이즈 M/L 금액 차이). 값이 없으면 기본가(price) 사용.
  variantPrices?: Record<string, number>;
  // 이 상품 상세에 노출할 추가옵션 코드(0048) — enabledAddons() 로 Addon[] 변환.
  enabledAddons: string[];
}


export type ProductSort = "newest" | "popular" | "likes";

// 주문/좋아요 정렬 — product_popularity 뷰(집계 숫자)에서 후보 상품의 순위를 받아
// JS 로 재정렬한다. PostgREST 는 임베드 집계 컬럼으로 order 하기 까다롭고, 카탈로그가
// 작고 캐시되므로 후처리 정렬이 간단·안전하다. anon/authenticated 모두 뷰 읽기 허용.
export async function rankBy(
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

export function applyRank<T extends { id: string }>(
  cards: T[],
  rank: Map<string, number>,
): T[] {
  return [...cards].sort(
    (a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0),
  );
}

// /shop 탐색 경로. 검색은 /search(lib/queries/search.ts)가 따로 맡는다.
//
// 예전엔 unstable_cache(120초)로 묶었는데, 2026-11-07 운영 기본 목록(전체·신상품순) 한 칸만
// 이틀 넘게 옛 재고를 보여 줬다(DB 는 재고 20인데 품절 표시, 다른 정렬·카테고리 칸은 정상).
// 그 칸만 갱신되지 않은 원인은 확정하지 못했다. 상품이 수십 개라 캐시 없는 검색 경로와 응답 시간이 같아서
// (운영 실측 둘 다 약 0.27초) 캐시를 걷고 매번 읽는다 → 품절·재입고가 바로 반영된다.
//
// 카테고리는 category!inner 조인 + categories.slug 필터로 거른다(PostgREST 는 embed 필터가
// 부모행을 좁히려면 inner 조인이어야 한다). 잘못된 슬러그는 매칭 카테고리가 없어 빈 배열.
//
// anon 클라라 빌드 프리렌더에서 실행되면 공개 env 없이 throw 하지만, /shop 은 searchParams
// prop 으로 선-dynamic 이라 빌드에서 호출되지 않는다.
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
    .select(`id, name, price, stock, sold_out, same_day, images, ${join}`)
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
    same_day: p.same_day,
    image: firstImage(p.images),
    image2: secondImage(p.images),
    category: p.categories?.name_en,
  }));
  // 어느 정렬이든 품절은 뒤로(대표님 2026-11-07).
  if (sort === "popular" || sort === "likes") {
    const rank = await rankBy(
      db,
      cards.map((c) => c.id),
      sort === "popular" ? "order_count" : "like_count",
    );
    return soldOutLast(applyRank(cards, rank));
  }
  return soldOutLast(cards);
}

export function getShopBrowse({
  category,
  sort = "newest",
}: { category?: string; sort?: ProductSort } = {}): Promise<ProductCardData[]> {
  return loadShopBrowse(category ?? null, sort);
}

// (getFeaturedProducts 는 구 홈 Featured Collection 용 — 헬릭스 리디자인(#197)으로
//  소비처가 사라져 제거 — #207.)

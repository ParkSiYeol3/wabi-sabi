import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { categorySlugs } from "@/lib/site";
import type { ProductCardData } from "@/components/product-card";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: unknown;
  categories: { slug: string; name_en: string } | null;
};

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

function imageList(images: unknown): string[] {
  return Array.isArray(images)
    ? images.filter((i): i is string => typeof i === "string")
    : [];
}

// WSB-012: 같은 카테고리 관련 상품 추천 (자기 제외).
export async function getRelatedProducts(
  categorySlug: string,
  excludeId: string,
  limit = 4,
): Promise<ProductCardData[]> {
  const supabase = await createClient();
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();
  if (!cat) return [];

  const { data } = await supabase
    .from("products")
    .select("id, name, price, stock, images, categories(slug, name_en)")
    .eq("is_active", true)
    .eq("category_id", cat.id)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ProductRow[]>();

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: firstImage(p.images),
    category: p.categories?.name_en,
  }));
}

export interface ProductDetail {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  material: string | null;
  size: string | null;
  care: string | null;
  images: string[];
  category: { slug: string; name_en: string; name_ko: string } | null;
}

// WSB-010: 상품 상세 단건 조회 (없거나 비활성 → null).
export async function getProduct(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, stock, description, material, size, care, images, categories(slug, name_en, name_ko)",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    name: string;
    price: number;
    stock: number;
    description: string | null;
    material: string | null;
    size: string | null;
    care: string | null;
    images: unknown;
    categories: { slug: string; name_en: string; name_ko: string } | null;
  };
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
    description: row.description,
    material: row.material,
    size: row.size,
    care: row.care,
    images: imageList(row.images),
    category: row.categories,
  };
}

export type ProductSort = "newest" | "price_asc" | "price_desc";

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

  // category="monthly" 는 종류가 아니라 이 달의 상품 필터(is_monthly).
  const monthly = category === "monthly";
  const filterByCategory = !!category && !monthly;

  // 카테고리 필터는 slug→id 별도 조회 대신 !inner 조인 필터로 한 번에.
  // 대분류 slug 는 하위 소분류까지 확장해 매칭한다(#193 2계층 트리).
  let query = supabase
    .from("products")
    .select(
      filterByCategory
        ? "id, name, price, stock, images, categories!inner(slug, name_en)"
        : "id, name, price, stock, images, categories(slug, name_en)",
    )
    .eq("is_active", true);

  if (monthly) query = query.eq("is_monthly", true);
  if (filterByCategory)
    query = query.in("categories.slug", categorySlugs(category!));
  if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);

  // 정렬
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query.returns<ProductRow[]>();
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: firstImage(p.images),
    category: p.categories?.name_en,
  }));
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
  const monthly = category === "monthly";
  const filterByCategory = !!category && !monthly;

  const join = filterByCategory
    ? "categories!inner(slug, name_en)"
    : "categories(slug, name_en)";

  let query = db
    .from("products")
    .select(`id, name, price, stock, images, ${join}`)
    .eq("is_active", true);

  if (monthly) query = query.eq("is_monthly", true);
  // 대분류 slug 는 하위 소분류까지 확장해 매칭한다(#193 2계층 트리).
  else if (filterByCategory)
    query = query.in("categories.slug", categorySlugs(category));

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.returns<ProductRow[]>();
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: firstImage(p.images),
    category: p.categories?.name_en,
  }));
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

// 홈 Featured Collection — '이 달의 상품'(is_monthly) 우선, 모자라면 최신으로 채운다.
// 대표님이 monthly 를 지정하지 않은 기간에도 홈이 비지 않도록 하는 폴백.
export async function getFeaturedProducts(
  count = 4,
): Promise<ProductCardData[]> {
  const monthly = await getProducts({ category: "monthly", limit: count });
  if (monthly.length >= count) return monthly;

  const seen = new Set(monthly.map((p) => p.id));
  // 채울 만큼만 더 가져오되, monthly 와 겹칠 수 있어 여유분(count)을 요청 후 잘라낸다.
  const recent = await getProducts({ limit: count * 2 });
  return [...monthly, ...recent.filter((p) => !seen.has(p.id))].slice(0, count);
}

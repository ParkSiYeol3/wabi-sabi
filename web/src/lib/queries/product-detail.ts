import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { ProductCardData } from "@/components/product/product-card";
import type { ProductDetail } from "@/lib/queries/products";
import type { ReviewStats } from "@/lib/queries/reviews";
import { parseOptionGroups } from "@/lib/product-options";

// 상품 상세의 공개 데이터(상품·관련상품·평점)를 한 번에 캐시한다 (#181).
// 리뷰/위시/재입고 구독 등 사용자별 데이터는 여기 넣지 않는다(캐시 밖에서 조회).
// anon 클라이언트라 공개 RLS(is_active 상품·hidden=false 리뷰)만 본다.

export type ProductDetailBundle = {
  product: ProductDetail;
  related: ProductCardData[];
  stats: ReviewStats;
};

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}
function secondImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[1] === "string"
    ? images[1]
    : null;
}
function imageList(images: unknown): string[] {
  return Array.isArray(images)
    ? images.filter((s): s is string => typeof s === "string")
    : [];
}

type DetailRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold_out: boolean;
  description: string | null;
  material: string | null;
  size: string | null;
  care: string | null;
  origin: string | null;
  images: unknown;
  options: unknown;
  enabled_addons: unknown;
  category_id: string | null;
  categories: { slug: string; name_en: string; name_ko: string } | null;
};

async function load(id: string): Promise<ProductDetailBundle | null> {
  const db = createPublicClient();

  const { data } = await db
    .from("products")
    .select(
      "id, name, price, stock, sold_out, description, material, size, care, origin, images, options, enabled_addons, category_id, categories(slug, name_en, name_ko)",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle<DetailRow>();
  if (!data) return null;

  const product: ProductDetail = {
    id: data.id,
    name: data.name,
    price: data.price,
    stock: data.stock,
    sold_out: data.sold_out,
    description: data.description,
    material: data.material,
    size: data.size,
    care: data.care,
    origin: data.origin,
    images: imageList(data.images),
    category: data.categories,
    options: parseOptionGroups(data.options),
    // 코드 배열만 보관 — 상세 페이지가 enabledAddons() 로 Addon[] 변환. 배열 아니면
    // (구 데이터) 전체 노출을 위해 null 을 넘겨 addons.ts 폴백이 동작하게 한다.
    enabledAddons: Array.isArray(data.enabled_addons)
      ? (data.enabled_addons as string[])
      : [],
  };

  // 관련 상품(같은 카테고리) + 평점 통계 병렬.
  const [relatedRes, reviewsRes] = await Promise.all([
    data.category_id
      ? db
          .from("products")
          .select("id, name, price, stock, sold_out, images, categories(name_en)")
          .eq("is_active", true)
          .eq("category_id", data.category_id)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as unknown[] }),
    db.from("reviews").select("rating").eq("product_id", id),
  ]);

  const related: ProductCardData[] = (
    (relatedRes.data ?? []) as {
      id: string;
      name: string;
      price: number;
      stock: number;
      sold_out: boolean;
      images: unknown;
      categories: { name_en: string } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    sold_out: p.sold_out,
    image: firstImage(p.images),
    image2: secondImage(p.images),
    category: p.categories?.name_en,
  }));

  const ratings = ((reviewsRes.data ?? []) as { rating: number }[]).map(
    (r) => r.rating,
  );
  const stats: ReviewStats =
    ratings.length === 0
      ? { count: 0, average: 0 }
      : {
          count: ratings.length,
          average:
            Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
            10,
        };

  return { product, related, stats };
}

// 120초 캐시. id 가 캐시 키에 포함된다(상품별). 어드민 상품 변경 시
// revalidatePath(`/shop/${id}`) 로 무효화된다(이 캐시는 그 경로에서 호출됨).
export const getCachedProductDetail = unstable_cache(load, ["product-detail"], {
  revalidate: 120,
});

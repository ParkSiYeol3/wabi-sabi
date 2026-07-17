import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { ProductCardData } from "@/components/product-card";
import type { ProductDetail } from "@/lib/queries/products";
import type { ReviewStats } from "@/lib/queries/reviews";

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
  description: string | null;
  material: string | null;
  size: string | null;
  care: string | null;
  images: unknown;
  category_id: string | null;
  categories: { slug: string; name_en: string; name_ko: string } | null;
};

async function load(id: string): Promise<ProductDetailBundle | null> {
  const db = createPublicClient();

  const { data } = await db
    .from("products")
    .select(
      "id, name, price, stock, description, material, size, care, images, category_id, categories(slug, name_en, name_ko)",
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
    description: data.description,
    material: data.material,
    size: data.size,
    care: data.care,
    images: imageList(data.images),
    category: data.categories,
  };

  // 관련 상품(같은 카테고리) + 평점 통계 병렬.
  const [relatedRes, reviewsRes] = await Promise.all([
    data.category_id
      ? db
          .from("products")
          .select("id, name, price, stock, images, categories(name_en)")
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
      images: unknown;
      categories: { name_en: string } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: firstImage(p.images),
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

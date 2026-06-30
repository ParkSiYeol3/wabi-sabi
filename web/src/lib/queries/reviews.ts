import { createClient } from "@/lib/supabase/server";

export interface Review {
  id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}

export interface ReviewStats {
  count: number;
  average: number; // 0 if none
}

// 상품별 리뷰 목록 (최신순).
export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, author_name, rating, body, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .returns<Review[]>();
  if (error || !data) return [];
  return data;
}

// 상품별 평점 통계.
export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .returns<{ rating: number }[]>();
  if (error || !data || data.length === 0) return { count: 0, average: 0 };
  const sum = data.reduce((a, r) => a + r.rating, 0);
  return {
    count: data.length,
    average: Math.round((sum / data.length) * 10) / 10,
  };
}

export interface RecentReview extends Review {
  product_id: string;
  product_name: string | null;
}

type RecentRow = Review & {
  product_id: string;
  products: { name: string } | null;
};

// 전체 최신 리뷰 (/review 페이지).
export async function getRecentReviews(limit = 20): Promise<RecentReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, author_name, rating, body, created_at, product_id, products(name)")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RecentRow[]>();
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    author_name: r.author_name,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    product_id: r.product_id,
    product_name: r.products?.name ?? null,
  }));
}

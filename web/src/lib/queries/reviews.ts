import { createClient } from "@/lib/supabase/server";

export interface Review {
  id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
  hidden: boolean;
}

export interface ReviewStats {
  count: number;
  average: number; // 0 if none
}

// 상품별 리뷰 목록 (최신순).
// 공개 read 정책(0023)이 숨김 리뷰를 걸러내지만, 작성자 본인에겐 자기 리뷰가 숨김
// 상태여도 반환된다(재작성 시 중복 삽입 조용히 실패하는 문제 방지). hidden 을 함께
// 조회해 본인 화면에서 "숨김 처리됨" 을 표시한다.
export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, author_name, rating, body, created_at, hidden")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .returns<Review[]>();
  if (error || !data) return [];
  return data;
}

// 상품별 평점 통계. 숨김 리뷰는 평균/개수에서 제외한다 — 작성자 본인에겐 RLS 로
// 자기 숨김 리뷰가 보이므로 명시적으로 hidden=false 로 걸러 통계 왜곡을 막는다.
export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("hidden", false)
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

// 전체 최신 리뷰 (/review 페이지). 숨김 리뷰는 명시적으로 제외 — 작성자 본인에게도
// 이 공개 목록에선 자기 숨김 리뷰를 보이지 않게 한다(라벨 없는 노출 방지).
export async function getRecentReviews(limit = 20): Promise<RecentReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, author_name, rating, body, created_at, hidden, product_id, products(name)")
    .eq("hidden", false)
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
    hidden: r.hidden,
    product_id: r.product_id,
    product_name: r.products?.name ?? null,
  }));
}

// 구매 검증 (#126) — 리뷰는 구매자만 쓸 수 있어야 한다.
// 결제된 주문(paid·shipping·delivered)에 해당 상품이 들어 있어야 참. 미결제(pending)와
// 취소(cancelled)는 제외한다 — 결제 없이 주문만 만들어 리뷰를 다는 우회를 막는다.
//
// RLS(0002 "own order_items select")가 본인 주문 항목만 노출하므로 사용자 클라이언트로
// 조회해도 타인의 구매 이력이 새지 않는다. 서버 액션·UI 양쪽에서 같은 함수를 쓴다.
const PURCHASED_STATUSES = ["paid", "shipping", "delivered"];

export async function hasPurchased(productId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("order_items")
    .select("id, orders!inner(user_id, status)")
    .eq("product_id", productId)
    .eq("orders.user_id", user.id)
    .in("orders.status", PURCHASED_STATUSES)
    .limit(1);

  if (error) {
    console.error("[reviews] 구매 이력 조회 실패", error);
    return false; // 확인 불가 시 작성 불허(fail-closed) — 가짜 리뷰가 더 나쁘다
  }
  return (data?.length ?? 0) > 0;
}

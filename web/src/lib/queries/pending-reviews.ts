import type { SupabaseClient } from "@supabase/supabase-js";
import { activeLines } from "@/lib/orders";
import type { PendingReview } from "@/components/account/review-prompt";

// 리뷰를 아직 안 쓴 배송완료 상품(#919, 마이페이지 안내). 본인 세션 클라이언트로 읽어 RLS 가
// 본인 주문·리뷰만 돌려준다. 판매 중지된 상품은 products 조인이 비어 빠진다(리뷰 칸이 없음).
// 최근 배송완료 순, 상품당 한 번.
type Row = {
  delivered_at: string | null;
  order_items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    products: { images: unknown } | null;
  }[];
};

export async function getPendingReviews(
  supabase: SupabaseClient,
  userId: string,
): Promise<PendingReview[]> {
  const [{ data: orders }, { data: mine }] = await Promise.all([
    supabase
      .from("orders")
      .select("delivered_at, order_items(product_id, product_name, quantity, products(images))")
      .eq("user_id", userId)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .limit(20)
      .returns<Row[]>(),
    supabase
      .from("reviews")
      .select("product_id")
      .eq("user_id", userId)
      .returns<{ product_id: string }[]>(),
  ]);
  const reviewed = new Set((mine ?? []).map((r) => r.product_id));
  const seen = new Set<string>();
  const out: PendingReview[] = [];
  for (const o of orders ?? []) {
    for (const it of activeLines(o.order_items)) {
      const pid = it.product_id;
      if (!pid || !it.products || seen.has(pid) || reviewed.has(pid)) continue;
      seen.add(pid);
      const imgs = it.products.images;
      out.push({
        productId: pid,
        name: it.product_name,
        image: Array.isArray(imgs) && typeof imgs[0] === "string" ? imgs[0] : null,
      });
    }
  }
  return out;
}

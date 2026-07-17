import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Stars } from "@/components/stars";
import { ReportReviewButton } from "@/components/report-review-button";
import { getRecentReviews } from "@/lib/queries/reviews";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "리뷰",
  description: "WABI-SABI 고객 리뷰",
};

// 이 페이지는 getUser()(쿠키)로 결국 dynamic 이지만, 캐시된 getRecentReviews 가
// 그보다 먼저 실행돼 빌드 프리렌더 중 createPublicClient 를 호출한다(CI엔 공개 env
// 미주입 → 빌드 실패). 명시적으로 요청 시 렌더로 고정한다. 리뷰 목록은 unstable_cache
// 로 캐시되므로 DB 왕복은 그대로 제거된다.
export const dynamic = "force-dynamic";

export default async function ReviewListPage() {
  const reviews = await getRecentReviews();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">리뷰</h1>

      {reviews.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          아직 등록된 리뷰가 없습니다.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
          {reviews.map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size={14} />
                  <span className="text-sm font-medium">{r.author_name}</span>
                </div>
                <span className="flex items-center gap-3 text-xs text-wabi-fg-muted">
                  <time>{new Date(r.created_at).toLocaleDateString("ko-KR")}</time>
                  {user && user.id !== r.user_id && (
                    <ReportReviewButton
                      reviewId={r.id}
                      productId={r.product_id}
                    />
                  )}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
                {r.body}
              </p>
              {r.product_name && (
                <Link
                  href={`/shop/${r.product_id}`}
                  className="mt-2 inline-block text-xs text-wabi-fg-muted underline hover:text-wabi-fg"
                >
                  {r.product_name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/stars";
import { getProductReviews, getReviewStats } from "@/lib/queries/reviews";
import { createReview, deleteReview } from "@/app/shop/[id]/review-actions";

// 상품 상세 리뷰 섹션. currentUserId 있으면 작성 폼 노출(없으면 로그인 유도).
export async function ReviewSection({
  productId,
  currentUserId,
}: {
  productId: string;
  currentUserId: string | null;
}) {
  const [reviews, stats] = await Promise.all([
    getProductReviews(productId),
    getReviewStats(productId),
  ]);
  const alreadyReviewed = currentUserId
    ? reviews.some((r) => r.user_id === currentUserId)
    : false;

  return (
    <section className="mt-20">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium">리뷰</h2>
        {stats.count > 0 && (
          <span className="flex items-center gap-2 text-sm text-wabi-fg-muted">
            <Stars value={stats.average} />
            {stats.average.toFixed(1)} ({stats.count})
          </span>
        )}
      </div>

      {/* 작성 폼 */}
      {currentUserId ? (
        alreadyReviewed ? (
          <p className="mt-6 text-sm text-wabi-fg-muted">
            이미 이 상품에 리뷰를 작성하셨습니다.
          </p>
        ) : (
          <form
            action={createReview}
            className="mt-6 space-y-3 border border-wabi-border p-5"
          >
            <input type="hidden" name="product_id" value={productId} />
            <label className="flex items-center gap-2 text-sm">
              평점
              <select
                name="rating"
                defaultValue="5"
                className="border border-wabi-border bg-transparent px-2 py-1 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} ({n})
                  </option>
                ))}
              </select>
            </label>
            <textarea
              name="body"
              required
              rows={3}
              placeholder="상품 사용 후기를 남겨주세요"
              className="w-full border border-wabi-border bg-transparent px-3 py-2 text-sm"
            />
            <Button
              type="submit"
              className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
            >
              리뷰 등록
            </Button>
          </form>
        )
      ) : (
        <p className="mt-6 text-sm text-wabi-fg-muted">
          <Link
            href={`/auth?redirect=/shop/${productId}`}
            className="underline hover:text-wabi-fg"
          >
            로그인
          </Link>{" "}
          후 리뷰를 작성할 수 있습니다.
        </p>
      )}

      {/* 목록 */}
      {reviews.length === 0 ? (
        <p className="mt-8 text-sm text-wabi-fg-muted">
          아직 등록된 리뷰가 없습니다.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-wabi-border border-t border-wabi-border">
          {reviews.map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size={14} />
                  <span className="text-sm font-medium">{r.author_name}</span>
                </div>
                <span className="flex items-center gap-3 text-xs text-wabi-fg-muted">
                  <time>{new Date(r.created_at).toLocaleDateString("ko-KR")}</time>
                  {currentUserId === r.user_id && (
                    <form action={deleteReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="product_id" value={productId} />
                      <button type="submit" className="underline hover:text-red-600">
                        삭제
                      </button>
                    </form>
                  )}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

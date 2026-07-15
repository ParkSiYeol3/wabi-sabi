"use client";

import { useActionState } from "react";
import { reportReview } from "@/app/shop/[id]/review-actions";
import { REPORT_REASONS } from "@/lib/reviews/report-reasons";

type State = { done: boolean };

// 리뷰 신고 버튼 (#141). details 로 접어두고, 펼치면 사유 선택 + 접수.
// 접수 후에는 "신고 접수됨" 으로 바뀐다. 중복/자기 리뷰 신고는 서버에서 무시되지만
// UI 상으론 동일하게 접수로 표시(신고 여부를 타인에게 노출하지 않기 위함).
export function ReportReviewButton({
  reviewId,
  productId,
}: {
  reviewId: string;
  productId?: string;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      await reportReview(formData);
      return { done: true };
    },
    { done: false },
  );

  if (state.done) {
    return <span className="text-xs text-wabi-fg-muted">신고 접수됨</span>;
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer list-none text-wabi-fg-muted hover:text-wabi-fg">
        신고
      </summary>
      <form action={action} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="review_id" value={reviewId} />
        {productId && (
          <input type="hidden" name="product_id" value={productId} />
        )}
        <select
          name="reason"
          defaultValue={REPORT_REASONS[0]}
          aria-label="신고 사유"
          className="border border-wabi-border bg-transparent px-1 py-0.5"
        >
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="underline hover:text-red-600 disabled:opacity-50"
        >
          접수
        </button>
      </form>
    </details>
  );
}

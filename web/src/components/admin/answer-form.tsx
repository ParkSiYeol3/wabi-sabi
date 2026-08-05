"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { adminAction } from "@/components/admin/ui";
import { answerInquiry, type AnswerResult } from "@/app/admin/inquiries/actions";

// 문의 답변 폼 — 저장 후 "✓ 답변이 저장되었습니다"(초록)/오류(빨강)를 인라인 표시
// (대표님 — 완료 피드백·직관성). 서버 액션(answerInquiry)을 useActionState 로 붙인다.
export function AnswerForm({
  inquiryId,
  existingAnswer,
  title,
}: {
  inquiryId: string;
  existingAnswer: string | null;
  title: string;
}) {
  const [state, action] = useActionState<AnswerResult | null, FormData>(
    answerInquiry,
    null,
  );

  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="id" value={inquiryId} />
      <textarea
        name="answer"
        rows={3}
        required
        defaultValue={existingAnswer ?? ""}
        aria-label={`${title} 답변 작성`}
        placeholder="답변 작성"
        className="w-full rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 py-2 text-sm outline-none transition-colors focus:border-wabi-fg"
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          pendingText="저장 중…"
          className={adminAction({ tone: "solid" })}
        >
          {existingAnswer ? "답변 수정" : "답변 등록"}
        </SubmitButton>
        {state && (
          <span
            role="status"
            className={`text-sm font-medium ${state.ok ? "text-green-700" : "text-red-700"}`}
          >
            {state.ok ? "✓ " : ""}
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

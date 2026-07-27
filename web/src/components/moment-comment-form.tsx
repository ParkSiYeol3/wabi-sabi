"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createComment, type CommentResult } from "@/app/today/actions";

// 상세 페이지 댓글 작성 — 로그인 사용자 전용(page 에서 게이트). 성공 시 초기화.
export function MomentCommentForm({ momentId }: { momentId: string }) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [state, action, pending] = useActionState<CommentResult | null, FormData>(
    async (prev, formData) => {
      const result = await createComment(prev, formData);
      if (result.ok && bodyRef.current) bodyRef.current.value = "";
      return result;
    },
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="moment_id" value={momentId} />
      <textarea
        ref={bodyRef}
        name="body"
        rows={2}
        maxLength={500}
        required
        aria-label="댓글"
        placeholder="댓글을 남겨주세요 (500자 이내)"
        className="w-full resize-y border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-wabi-fg"
      />
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "등록 중…" : "댓글 등록"}
        </Button>
        {state && (
          <span
            role="status"
            className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
          >
            {state.ok ? "✓ " : ""}
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

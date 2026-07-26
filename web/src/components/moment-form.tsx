"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createMoment, type MomentResult } from "@/app/today/actions";

// "오늘의 와비사비" 작성 폼 — 사진 필수 + 짧은 글(선택). 로그인 사용자 전용
// (page 에서 게이트). 성공 시 입력 초기화.
export function MomentForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [state, action, pending] = useActionState<MomentResult | null, FormData>(
    async (prev, formData) => {
      const result = await createMoment(prev, formData);
      if (result.ok) {
        if (fileRef.current) fileRef.current.value = "";
        if (bodyRef.current) bodyRef.current.value = "";
      }
      return result;
    },
    null,
  );

  return (
    <form
      action={action}
      className="space-y-3 border border-wabi-border bg-wabi-subtle/40 p-5"
    >
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        사진 (png·jpg·webp, 최대 12MB)
        <input
          ref={fileRef}
          type="file"
          name="image"
          required
          accept="image/png,image/jpeg,image/webp"
          className="cursor-pointer text-sm file:mr-3 file:cursor-pointer file:border file:border-wabi-border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-wabi-fg file:transition-colors hover:file:border-wabi-fg hover:file:bg-wabi-muted"
        />
      </label>
      <textarea
        ref={bodyRef}
        name="body"
        rows={2}
        maxLength={500}
        aria-label="글 (선택)"
        placeholder="일상 속 우리 그릇 이야기를 짧게 남겨주세요 (선택)"
        className="w-full resize-y border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-wabi-fg"
      />
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "올리는 중…" : "공유하기"}
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

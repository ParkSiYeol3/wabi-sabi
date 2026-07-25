"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveContent } from "@/app/admin/content/actions";
import type { ContentKey } from "@/lib/queries/content";

// 편집 가능한 텍스트 한 칸 (#249) — 저장 시 pending("저장 중…") + 성공/실패 메시지.
// useActionState 로 서버 액션 결과를 받아 폼별로 피드백을 보여준다.
export function ContentField({
  contentKey,
  label,
  hint,
  value,
  rows,
}: {
  contentKey: ContentKey;
  label: string;
  hint?: string;
  value: string;
  rows: number;
}) {
  const [state, action, pending] = useActionState(saveContent, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="key" value={contentKey} />
      <div>
        <label htmlFor={contentKey} className="block text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-1 text-xs text-wabi-fg-muted">{hint}</p>}
      </div>
      <textarea
        id={contentKey}
        name="value"
        defaultValue={value}
        rows={rows}
        required
        maxLength={5000}
        className="w-full rounded-lg border border-wabi-border bg-wabi-bg/60 p-3 text-sm leading-7 outline-none transition-colors focus:border-wabi-fg"
      />
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
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

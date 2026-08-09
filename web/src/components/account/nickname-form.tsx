"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/common/submit-button";
import { updateName, type UpdateNameResult } from "@/app/mypage/actions";

// 닉네임 저장 폼 — "저장 중…" 후 완료되면 "✓ 저장되었습니다"를 인라인 표시(대표님).
// 서버 액션(updateName)을 useActionState 로 붙여 결과 메시지를 받는다.
export function NicknameForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<UpdateNameResult | null, FormData>(
    updateName,
    null,
  );

  return (
    <form action={action} className="mt-4 max-w-sm">
      <label
        htmlFor="mypage-nickname"
        className="text-sm font-medium text-wabi-fg"
      >
        닉네임
      </label>
      <p className="mt-0.5 font-numeric text-xs text-wabi-fg-muted">
        커뮤니티 및 리뷰에 표시됩니다 (2~20자)
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          id="mypage-nickname"
          name="name"
          defaultValue={defaultName}
          placeholder="닉네임"
          aria-label="닉네임"
          minLength={2}
          maxLength={20}
          className="rounded-none font-numeric"
        />
        <SubmitButton
          styled
          pendingText="저장 중…"
          className="rounded-none bg-wabi-accent px-6 hover:bg-wabi-accent/90"
        >
          저장
        </SubmitButton>
      </div>
      {state && (
        <p
          role="status"
          className={`mt-2 font-numeric text-xs ${state.ok ? "text-green-700" : "text-red-700"}`}
        >
          {state.ok ? "✓ " : ""}
          {state.message}
        </p>
      )}
    </form>
  );
}

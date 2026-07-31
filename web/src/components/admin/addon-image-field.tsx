"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { saveAddonImage, removeAddonImage } from "@/app/admin/content/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { SubmitButton } from "@/components/submit-button";

// 추가 옵션(애드온) 사진 업로드·제거 (대표님). About 사진 필드와 같은 패턴을
// 옵션 코드별로 재사용한다. 현재 사진 미리보기 + 파일 선택 + 저장 + 제거.
export function AddonImageField({
  code,
  label,
  current,
}: {
  code: string;
  label: string;
  current: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      formData.set("code", code);
      const result = await saveAddonImage(prev, formData);
      if (result.ok && fileRef.current) fileRef.current.value = "";
      return result;
    },
    null,
  );

  return (
    <div className="space-y-3 rounded-lg border border-wabi-border p-4">
      <p className="text-sm font-medium text-wabi-fg">{label}</p>

      {current ? (
        <div className="relative size-24 overflow-hidden rounded-lg border border-wabi-border bg-wabi-subtle">
          <Image
            src={current}
            alt={`${label} 사진`}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
      ) : (
        <p className="text-xs text-wabi-fg-muted">
          등록된 사진이 없습니다. (상세에는 사진 자리만 표시됩니다)
        </p>
      )}

      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          className="cursor-pointer text-sm file:mr-3 file:cursor-pointer file:border file:border-wabi-border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-wabi-fg file:transition-colors hover:file:border-wabi-fg hover:file:bg-wabi-muted"
        />
        <Button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-wabi-accent px-4 hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "업로드 중…" : "사진 저장"}
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
      </form>

      {current && (
        <form action={removeAddonImage}>
          <input type="hidden" name="code" value={code} />
          <SubmitButton
            pendingText="제거 중…"
            className="cursor-pointer text-xs text-red-700 underline underline-offset-2 transition-colors hover:text-red-800"
          >
            사진 제거
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

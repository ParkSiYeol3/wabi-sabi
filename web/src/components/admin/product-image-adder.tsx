"use client";

import { useActionState, useRef } from "react";
import { addProductImages } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { adminAction } from "@/components/admin/ui";

// 상품 행 이미지 추가 폼 (클라이언트) — 업로드 결과(성공/실패 사유)를 인라인 표시.
export function ProductImageAdder({ productId }: { productId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await addProductImages(prev, formData);
      if (result.ok && fileRef.current) fileRef.current.value = "";
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={productId} />
      {/* 파일 선택 — 네이티브 입력의 "파일 선택" 버튼 부분(file:)을 브랜드 버튼으로 */}
      <input
        ref={fileRef}
        type="file"
        name="images"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="w-48 cursor-pointer text-xs text-wabi-fg-muted file:mr-2 file:cursor-pointer file:rounded-md file:border file:border-wabi-border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-wabi-fg file:transition-colors hover:file:border-wabi-fg hover:file:bg-wabi-muted"
      />
      <button
        type="submit"
        disabled={pending}
        className={adminAction({ tone: "outline", className: "self-start" })}
      >
        {pending ? "업로드 중…" : "이미지 추가"}
      </button>
      {state && (
        <p
          role="status"
          className={`max-w-48 text-xs ${state.ok ? "text-wabi-accent" : "text-red-700"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

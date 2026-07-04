"use client";

import { useActionState, useRef } from "react";
import { addProductImages } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";

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
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={productId} />
      <input
        ref={fileRef}
        type="file"
        name="images"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="w-36 cursor-pointer text-[10px] file:mr-2 file:cursor-pointer file:border file:border-wabi-border file:bg-transparent file:px-2 file:py-1 file:text-[10px] file:text-wabi-fg file:transition-colors hover:file:border-wabi-fg hover:file:bg-wabi-muted"
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer self-start text-xs text-wabi-accent underline transition-opacity hover:opacity-70 disabled:opacity-50"
      >
        {pending ? "업로드 중…" : "이미지 추가"}
      </button>
      {state && (
        <p
          role="status"
          className={`max-w-40 text-[10px] ${state.ok ? "text-wabi-accent" : "text-red-600"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

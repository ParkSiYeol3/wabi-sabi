"use client";

import { useActionState, useRef } from "react";
import { addProductImages } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { adminAction } from "@/components/admin/ui";
import { resizeFormImages } from "@/lib/resize-image";

// 상품 행 이미지 추가 — "이미지 추가" 한 번으로 파일 선택창을 열고, 파일을 고르면
// 곧바로 업로드한다(대표님 — 파일 선택 + 추가 두 단계가 헷갈림). 네이티브 file
// 입력은 숨기고 버튼이 대신 연다. onChange 에서 폼을 즉시 제출(requestSubmit).
export function ProductImageAdder({ productId }: { productId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      // 업로드 전 리사이즈 — 모바일 사진 여러 장이 바디 한도를 넘기지 않게(대표님).
      await resizeFormImages(formData);
      const result = await addProductImages(prev, formData);
      // 같은 파일을 다시 고를 때도 onChange 가 다시 발생하도록 값을 비운다.
      if (fileRef.current) fileRef.current.value = "";
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={productId} />
      <input
        ref={fileRef}
        type="file"
        name="images"
        multiple
        accept="image/*"
        className="hidden"
        onChange={() => {
          if (fileRef.current?.files?.length) formRef.current?.requestSubmit();
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
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

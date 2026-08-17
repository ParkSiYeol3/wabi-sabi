"use client";

import { useActionState, useState } from "react";
import { addProductImages } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { adminAction } from "@/components/admin/ui";
import { resizeFormImages } from "@/lib/resize-image";
import { ProductImagePicker } from "@/components/admin/product-image-picker";

// 상품 행 이미지 추가 — 이미지를 고르면 비율 크롭·회전·필터 편집 후(ProductImagePicker),
// "업로드" 로 서버에 올린다(대표님 — 편집 기능 추가). 업로드 성공 시 picker 를 remount 해
// 비운다.
export function ProductImageAdder({ productId }: { productId: string }) {
  const [count, setCount] = useState(0);
  const [pickerKey, setPickerKey] = useState(0);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      // 업로드 전 리사이즈(편집본은 이미 축소돼 대개 그대로 통과).
      await resizeFormImages(formData);
      const result = await addProductImages(prev, formData);
      if (result.ok) {
        setPickerKey((k) => k + 1);
        setCount(0);
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={productId} />
      <ProductImagePicker key={pickerKey} name="images" onFilesChange={setCount} />
      {count > 0 && (
        <button
          type="submit"
          disabled={pending}
          className={adminAction({ tone: "solid", className: "self-start" })}
        >
          {pending ? "업로드 중…" : `${count}장 업로드`}
        </button>
      )}
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

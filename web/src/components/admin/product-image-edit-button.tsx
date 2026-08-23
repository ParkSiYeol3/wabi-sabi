"use client";

import { useActionState, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { replaceProductImage } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { ImageEditor } from "@/components/admin/image-editor";
import { resizeFormImages } from "@/lib/resize-image";

// 이미 등록된 상품 사진 1장 편집(대표님) — 편집 버튼을 누르면 스토리지의 원본을
// 불러와 ImageEditor(크롭·회전·필터)를 열고, 적용하면 그 자리(index)를 편집본으로
// 교체한다. 편집본은 DataTransfer 로 숨김 file input 에 실어 replaceProductImage 로
// 제출한다(신규 업로드와 같은 방식). url 을 함께 보내 재정렬 사고를 서버에서 막는다.
export function ProductImageEditButton({
  productId,
  url,
  index,
  total,
}: {
  productId: string;
  url: string;
  index: number;
  total: number;
}) {
  const [source, setSource] = useState<File | null>(null); // 편집기 입력(원본)
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(async (prev, fd) => {
    await resizeFormImages(fd, "image"); // 편집본은 대개 이미 작지만 상한 보장
    return replaceProductImage(prev, fd);
  }, null);

  async function openEditor() {
    setLoading(true);
    try {
      // 스토리지 원본을 blob 으로 받아 File 로. same-origin 아닌 URL 이지만 blob 은
      // 캔버스를 오염(taint)시키지 않아 편집·재인코딩(toBlob)이 가능하다.
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const base = (url.split("/").pop() || "image").split("?")[0] || "image";
      const name = /\.(jpe?g|png|webp)$/i.test(base) ? base : `${base}.jpg`;
      setSource(new File([blob], name, { type: blob.type || "image/jpeg" }));
    } catch {
      // 실패 시 편집기를 열지 않는다(상태 메시지로 안내).
      setSource(null);
    } finally {
      setLoading(false);
    }
  }

  function handleApply(edited: File) {
    const dt = new DataTransfer();
    dt.items.add(edited);
    if (fileRef.current) fileRef.current.files = dt.files;
    setSource(null);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        disabled={loading || pending}
        aria-label="사진 편집"
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-wabi-border bg-wabi-bg text-xs text-wabi-fg transition-colors hover:bg-wabi-muted disabled:opacity-50"
      >
        <Pencil className="size-3.5" aria-hidden />
        {loading ? "여는 중…" : pending ? "교체 중…" : "편집"}
      </button>

      {/* 제출용 폼 — 편집본 File 을 DataTransfer 로 실어 서버 액션에 넘긴다. */}
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="id" value={productId} />
        <input type="hidden" name="index" value={index} />
        <input type="hidden" name="url" value={url} />
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/*"
          tabIndex={-1}
          aria-hidden
        />
      </form>

      {state && !state.ok && (
        <p role="status" className="text-[10px] text-red-700">
          {state.message}
        </p>
      )}

      {source && (
        <ImageEditor
          file={source}
          index={index}
          total={total}
          onApply={handleApply}
          onCancel={() => setSource(null)}
        />
      )}
    </>
  );
}

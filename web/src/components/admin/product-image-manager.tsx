"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { GripVertical, Star, X } from "lucide-react";
import { SubmitButton } from "@/components/common/submit-button";
import { ProductImageAdder } from "@/components/admin/product-image-adder";
import { ProductImageEditButton } from "@/components/admin/product-image-edit-button";
import { SortableImageGrid } from "@/components/admin/sortable-image-grid";
import {
  removeProductImage,
  reorderProductImages,
} from "@/app/admin/products/actions";

// 상품 사진 관리(대표님) — 수정 페이지. 첫 장=대표(상세 히어로·목록 썸네일·스캐터
// 맨 앞), 이후가 상세 스캐터 순서. 손잡이를 끌어 순서 변경(드래그, 모바일 포함),
// '대표' 별로 원클릭 대표 지정, ×로 삭제, 편집으로 크롭·회전·필터, 끝에서 추가.
// 순서는 로컬 상태로 즉시 반영하고 놓을 때 서버에 저장(reorderProductImages).
// 삭제·추가는 서버 액션 → 페이지 재검증 시 부모가 key 로 remount 해 상태를 재시드.
export function ProductImageManager({
  productId,
  images,
  name,
}: {
  productId: string;
  images: string[];
  name: string;
}) {
  const [order, setOrder] = useState<string[]>(images);
  const [, startTransition] = useTransition();

  const move = (from: number, to: number) =>
    setOrder((o) => {
      const next = [...o];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const persist = (next: string[]) => {
    const fd = new FormData();
    fd.set("id", productId);
    fd.set("order", JSON.stringify(next));
    startTransition(() => reorderProductImages(fd));
  };

  // 대표로 지정 — 해당 사진을 맨 앞으로 옮기고 즉시 저장(원클릭, 대표님).
  const setCover = (url: string) => {
    const next = [url, ...order.filter((u) => u !== url)];
    setOrder(next);
    persist(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-wabi-fg-muted">
        첫 장이 대표 · 손잡이를 끌어 순서 변경 · ★로 대표 지정 · 편집으로 크롭·회전·필터
      </p>
      <div className="flex flex-wrap gap-3">
        <SortableImageGrid
          className="flex flex-wrap gap-3"
          itemClassName="flex w-22 shrink-0 flex-col gap-1.5"
          ids={order}
          onReorder={move}
          onDragEnd={() => persist(order)}
          renderItem={(url, i) => (
            <>
              <span className="relative block">
                <Image
                  src={url}
                  alt={name}
                  width={88}
                  height={88}
                  className="size-22 rounded-lg object-cover"
                />
                <span className="absolute left-1 top-1 rounded bg-wabi-fg/90 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white">
                  {i === 0 ? "대표" : `상세${i}`}
                </span>
                {order.length > 1 && (
                  <span
                    data-drag-handle
                    role="button"
                    aria-label="순서 이동(끌기)"
                    style={{ touchAction: "none" }}
                    className="absolute bottom-1 right-1 flex size-6 cursor-grab items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 active:cursor-grabbing"
                  >
                    <GripVertical className="size-3.5" aria-hidden />
                  </span>
                )}
                <form action={removeProductImage}>
                  <input type="hidden" name="id" value={productId} />
                  <input type="hidden" name="url" value={url} />
                  <SubmitButton
                    pendingText="…"
                    aria-label="이미지 삭제"
                    className="absolute -right-1.5 -top-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700"
                  >
                    <X className="size-3.5" aria-hidden />
                  </SubmitButton>
                </form>
              </span>
              {/* 대표로 지정 — 첫 장이 아니면 노출. 원클릭으로 맨 앞으로. */}
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(url)}
                  className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-wabi-border bg-wabi-bg text-xs text-wabi-fg transition-colors hover:border-wabi-fg hover:bg-wabi-muted"
                >
                  <Star className="size-3.5" aria-hidden /> 대표
                </button>
              )}
              <ProductImageEditButton
                productId={productId}
                url={url}
                index={i}
                total={order.length}
              />
            </>
          )}
        />
        <div className="flex shrink-0 items-start">
          <ProductImageAdder productId={productId} />
        </div>
      </div>
    </div>
  );
}

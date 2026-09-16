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
  removeProductImages,
  reorderProductImages,
} from "@/app/admin/products/actions";

// 상품 사진 관리(대표님) — 수정 페이지. 첫 장=대표(상세 히어로·목록 썸네일·스캐터
// 맨 앞), 이후가 상세 스캐터 순서. 손잡이를 끌어 순서 변경(드래그, 모바일 포함),
// '대표' 별로 원클릭 대표 지정, ×로 삭제, 편집으로 크롭·회전·필터, 끝에서 추가.
// 사진을 통째로 바꿀 때를 위해 선택 삭제·전체 삭제도 둔다(#678) — 되돌릴 수 없어
// 한 번 더 확인받는다.
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
  // 선택 삭제용 — 고른 사진 url. 확인 단계는 confirming 으로 구분한다.
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<null | "selected" | "all">(null);

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

  const toggle = (url: string) =>
    setSelected((s) =>
      s.includes(url) ? s.filter((u) => u !== url) : [...s, url],
    );

  const btn =
    "cursor-pointer rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-wabi-fg-muted">
        첫 장이 대표 · 손잡이를 끌어 순서 변경 · ★로 대표 지정 · 편집으로 크롭·회전·필터
      </p>

      {/* 일괄 삭제 도구(#678) — 사진을 통째로 바꿀 때. 삭제는 되돌릴 수 없어 확인 단계를 둔다. */}
      {order.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-numeric text-xs text-wabi-fg-muted">
            {selected.length > 0 ? `${selected.length}장 선택됨` : `사진 ${order.length}장`}
          </span>
          {confirming === null ? (
            <>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => setConfirming("selected")}
                className={`${btn} border-wabi-border text-wabi-fg hover:border-wabi-fg`}
              >
                선택 삭제
              </button>
              <button
                type="button"
                onClick={() => setConfirming("all")}
                className={`${btn} border-red-300 text-red-700 hover:bg-red-50`}
              >
                전체 삭제
              </button>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className={`${btn} border-transparent text-wabi-fg-muted hover:text-wabi-fg`}
                >
                  선택 해제
                </button>
              )}
            </>
          ) : (
            <form
              action={removeProductImages}
              className="flex flex-wrap items-center gap-2"
              onSubmit={() => {
                setConfirming(null);
                setSelected([]);
              }}
            >
              <input type="hidden" name="id" value={productId} />
              {confirming === "all" ? (
                <input type="hidden" name="all" value="true" />
              ) : (
                selected.map((url) => (
                  <input key={url} type="hidden" name="url" value={url} />
                ))
              )}
              <span className="text-xs text-red-700">
                {confirming === "all"
                  ? `사진 ${order.length}장을 모두 지울까요? 되돌릴 수 없습니다.`
                  : `선택한 ${selected.length}장을 지울까요? 되돌릴 수 없습니다.`}
              </span>
              <SubmitButton
                pendingText="삭제 중…"
                className={`${btn} border-red-600 bg-red-600 text-white hover:bg-red-700`}
              >
                삭제
              </SubmitButton>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className={`${btn} border-wabi-border text-wabi-fg hover:border-wabi-fg`}
              >
                취소
              </button>
            </form>
          )}
        </div>
      )}

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
                {/* 선택(일괄 삭제용) — 드래그 손잡이(우하)·삭제 ×(우상)와 겹치지 않게 좌하. */}
                <label className="absolute bottom-1 left-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/55">
                  <input
                    type="checkbox"
                    checked={selected.includes(url)}
                    onChange={() => toggle(url)}
                    aria-label={`${i === 0 ? "대표" : `상세${i}`} 사진 선택`}
                    className="size-3.5 cursor-pointer accent-red-600"
                  />
                </label>
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

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { SubmitButton } from "@/components/common/submit-button";
import { ProductImageAdder } from "@/components/admin/product-image-adder";
import { ProductImageEditButton } from "@/components/admin/product-image-edit-button";
import {
  removeProductImage,
  moveProductImage,
} from "@/app/admin/products/actions";

// 상품 사진 관리(대표님) — 수정 페이지에서 사용. 첫 장=대표(상세 히어로), 이후가
// 상세 스캐터 순서. 큰 ◀ ▶ 로 순서 이동, ×로 삭제, 편집으로 크롭·회전·필터, 끝에서
// 추가. 폼은 서버 액션(removeProductImage·moveProductImage), 편집·추가만 클라 컴포넌트.
export function ProductImageManager({
  productId,
  images,
  name,
}: {
  productId: string;
  images: string[];
  name: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-wabi-fg-muted">
        첫 장이 대표 · ◀▶ 순서 이동 · 편집으로 크롭·회전·필터
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i, arr) => (
          <div key={url} className="flex w-22 shrink-0 flex-col gap-1.5">
            <span className="relative">
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
            <div className="flex gap-1.5">
              <form action={moveProductImage} className="flex-1">
                <input type="hidden" name="id" value={productId} />
                <input type="hidden" name="from" value={i} />
                <input type="hidden" name="dir" value="left" />
                <SubmitButton
                  pendingText="…"
                  aria-label="앞으로 이동"
                  disabled={i === 0}
                  className="flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-wabi-border bg-wabi-bg text-wabi-fg transition-colors hover:bg-wabi-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </SubmitButton>
              </form>
              <form action={moveProductImage} className="flex-1">
                <input type="hidden" name="id" value={productId} />
                <input type="hidden" name="from" value={i} />
                <input type="hidden" name="dir" value="right" />
                <SubmitButton
                  pendingText="…"
                  aria-label="뒤로 이동"
                  disabled={i === arr.length - 1}
                  className="flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-wabi-border bg-wabi-bg text-wabi-fg transition-colors hover:bg-wabi-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </SubmitButton>
              </form>
            </div>
            <ProductImageEditButton
              productId={productId}
              url={url}
              index={i}
              total={arr.length}
            />
          </div>
        ))}
        <div className="flex shrink-0 items-start">
          <ProductImageAdder productId={productId} />
        </div>
      </div>
    </div>
  );
}

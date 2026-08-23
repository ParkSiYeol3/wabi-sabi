import Image from "next/image";
import Link from "next/link";
import { ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { won } from "@/lib/orders";
import { isLowStock } from "@/lib/inventory";
import { adminAction } from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import { ProductImageAdder } from "@/components/admin/product-image-adder";
import { ProductImageEditButton } from "@/components/admin/product-image-edit-button";
import {
  updateStock,
  toggleActive,
  toggleMonthly,
  deleteProduct,
  removeProductImage,
  moveProductImage,
} from "@/app/admin/products/actions";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  is_monthly: boolean;
  images: string[] | null;
};

// 상품 관리 목록의 한 상품 = 카드(대표님 — shop 상품 카드처럼 크고 깔끔하게, 칸 구분
// 크게). 위: 대표 이미지 크게(shop 카드와 동일한 aspect-square·object-cover) + 상품명·
// 가격. 아래: 사진 관리(순서 이동·삭제·추가) + 재고·월간·노출·수정·삭제. 폼·서버액션은
// 기존과 동일하고 레이아웃만 shop 카드 톤으로.
export function ProductAdminCard({ product: p }: { product: Product }) {
  const images = p.images ?? [];
  const cover = images[0] ?? null;
  const soldOut = p.stock <= 0;

  return (
    <div className="overflow-hidden rounded-xl border border-wabi-border bg-wabi-bg/50 shadow-sm">
      {/* 대표 이미지 — shop 카드처럼 크게 */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
        {p.is_monthly && (
          <span className="absolute left-3 top-3 z-20 rounded-full bg-wabi-fg/90 px-2.5 py-1 text-xs font-medium tracking-wide text-wabi-bg">
            월간
          </span>
        )}
        {soldOut ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm tracking-wide text-wabi-fg">
            Out of Stock
          </span>
        ) : (
          !p.is_active && (
            <span className="absolute right-3 top-3 z-20 rounded-full border border-wabi-border bg-wabi-bg/90 px-2.5 py-1 text-xs text-wabi-fg-muted">
              숨김
            </span>
          )
        )}
        {cover ? (
          <Image
            src={cover}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <ImageIcon
            className="size-10 text-wabi-fg-muted/40"
            strokeWidth={1}
            aria-hidden
          />
        )}
      </div>

      {/* 정보 + 관리 — 넉넉한 패딩·간격 */}
      <div className="space-y-5 p-5">
        <div>
          <p className="text-base font-medium text-wabi-fg">{p.name}</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums text-wabi-fg">
            {won(p.price)}
            {!soldOut && isLowStock(p.stock) && (
              <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs font-normal text-amber-800">
                재고 부족
              </span>
            )}
          </p>
        </div>

        {/* 사진 순서·관리 — 첫 장이 대표. 큰 ◀ ▶ 버튼으로 순서 이동(대표님: 버튼
            크고 직관적으로). 사진 아래 넓은 이동 버튼 한 쌍 + 우상단 삭제. */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-wabi-fg-muted">
            사진 관리 · 첫 장이 대표 · ◀▶ 순서 이동 · 편집으로 크롭·회전·필터
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.map((url, i, arr) => (
              <div key={url} className="flex shrink-0 flex-col gap-1.5">
                <span className="relative">
                  <Image
                    src={url}
                    alt={p.name}
                    width={88}
                    height={88}
                    className="size-22 rounded-lg object-cover"
                  />
                  <span className="absolute left-1 top-1 rounded bg-wabi-fg/90 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white">
                    {i === 0 ? "대표" : `상세${i}`}
                  </span>
                  <form action={removeProductImage}>
                    <input type="hidden" name="id" value={p.id} />
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
                {/* 큰 이동 버튼 한 쌍 — 사진 폭 전체를 채워 누르기 쉽게 */}
                <div className="flex gap-1.5">
                  <form action={moveProductImage} className="flex-1">
                    <input type="hidden" name="id" value={p.id} />
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
                    <input type="hidden" name="id" value={p.id} />
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
                {/* 이미 등록된 사진 편집(크롭·회전·필터) — 대표님 */}
                <ProductImageEditButton
                  productId={p.id}
                  url={url}
                  index={i}
                  total={arr.length}
                />
              </div>
            ))}
            <div className="flex shrink-0 items-start">
              <ProductImageAdder productId={p.id} />
            </div>
          </div>
        </div>

        {/* 컨트롤 — 재고 / 상태 토글 / 수정·삭제. 칸 구분 크게. */}
        <div className="space-y-3 border-t border-wabi-border pt-4">
          <form action={updateStock} className="flex items-center gap-2">
            <label className="text-sm text-wabi-fg-muted">재고</label>
            <input type="hidden" name="id" value={p.id} />
            <input
              name="stock"
              type="number"
              min={0}
              defaultValue={p.stock}
              aria-label={`${p.name} 재고 수량`}
              className="w-20 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2 py-1.5 text-sm outline-none transition-colors focus:border-wabi-fg"
            />
            <SubmitButton
              pendingText="저장 중…"
              className={adminAction({ tone: "outline" })}
            >
              저장
            </SubmitButton>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <form action={toggleMonthly}>
              <input type="hidden" name="id" value={p.id} />
              <input
                type="hidden"
                name="is_monthly"
                value={String(p.is_monthly)}
              />
              <SubmitButton
                pendingText="변경 중…"
                className={adminAction({
                  tone: p.is_monthly ? "solid" : "outline",
                })}
              >
                {p.is_monthly ? "월간 지정됨" : "월간 지정"}
              </SubmitButton>
            </form>

            <form action={toggleActive}>
              <input type="hidden" name="id" value={p.id} />
              <input
                type="hidden"
                name="is_active"
                value={String(p.is_active)}
              />
              <SubmitButton
                pendingText="변경 중…"
                className={adminAction({
                  tone: p.is_active ? "solid" : "outline",
                })}
              >
                {p.is_active ? "노출중" : "숨김"}
              </SubmitButton>
            </form>

            <Link
              href={`/admin/products/${p.id}`}
              className={adminAction({ tone: "outline" })}
            >
              수정
            </Link>

            <form action={deleteProduct} className="ml-auto">
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton
                pendingText="삭제 중…"
                className={adminAction({ tone: "danger" })}
              >
                삭제
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

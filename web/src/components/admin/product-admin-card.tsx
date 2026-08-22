import Image from "next/image";
import Link from "next/link";
import { won } from "@/lib/orders";
import { isLowStock } from "@/lib/inventory";
import { adminAction } from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import { ProductImageAdder } from "@/components/admin/product-image-adder";
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

// 상품 관리 목록의 한 상품 = 카드(대표님 — 모바일에서 테이블이 세로로 찌그러져
// 관리 불편). 상품명·가격 헤더 + 이미지 스트립(가로 스크롤·대표/상세 순서 이동·삭제·
// 추가) + 컨트롤(재고·월간·노출·수정·삭제). 폼·서버액션은 기존 테이블과 동일 —
// 레이아웃만 카드로 바꿔 모바일·데스크톱 모두 편하게 한다.
export function ProductAdminCard({ product: p }: { product: Product }) {
  const images = p.images ?? [];
  return (
    <div className="space-y-3 rounded-lg border border-wabi-border bg-wabi-bg/40 p-4">
      {/* 헤더 — 상품명·가격 + 상태 배지 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-wabi-fg">{p.name}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-wabi-fg">
            {won(p.price)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {p.stock === 0 ? (
            <span className="whitespace-nowrap rounded-full border border-red-300 px-2 py-0.5 text-xs text-red-700">
              품절
            </span>
          ) : isLowStock(p.stock) ? (
            <span className="whitespace-nowrap rounded-full border border-amber-300 px-2 py-0.5 text-xs text-amber-800">
              부족
            </span>
          ) : null}
          {!p.is_active && (
            <span className="whitespace-nowrap rounded-full border border-wabi-border px-2 py-0.5 text-xs text-wabi-fg-muted">
              숨김
            </span>
          )}
        </div>
      </div>

      {/* 이미지 스트립 — 가로 스크롤(모바일). 첫 장=대표, 이후=상세 순서. ◀▶ 로 재배치. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((url, i, arr) => (
          <div key={url} className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="relative">
              <Image
                src={url}
                alt={p.name}
                width={48}
                height={48}
                className="size-12 rounded object-cover"
              />
              <span className="absolute -left-1 -top-1 rounded bg-wabi-fg px-1 text-[9px] font-medium leading-tight text-white">
                {i === 0 ? "대표" : `상세${i}`}
              </span>
              <form action={removeProductImage}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="url" value={url} />
                <SubmitButton
                  pendingText="…"
                  aria-label="이미지 삭제"
                  className="absolute -right-1 -top-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white transition-colors hover:bg-red-700"
                >
                  ×
                </SubmitButton>
              </form>
            </span>
            <div className="flex gap-0.5">
              {i > 0 && (
                <form action={moveProductImage}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="from" value={i} />
                  <input type="hidden" name="dir" value="left" />
                  <SubmitButton
                    pendingText="…"
                    aria-label="앞으로 이동"
                    className="flex size-4 cursor-pointer items-center justify-center rounded border border-wabi-border text-[10px] leading-none text-wabi-fg transition-colors hover:bg-wabi-muted"
                  >
                    ◀
                  </SubmitButton>
                </form>
              )}
              {i < arr.length - 1 && (
                <form action={moveProductImage}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="from" value={i} />
                  <input type="hidden" name="dir" value="right" />
                  <SubmitButton
                    pendingText="…"
                    aria-label="뒤로 이동"
                    className="flex size-4 cursor-pointer items-center justify-center rounded border border-wabi-border text-[10px] leading-none text-wabi-fg transition-colors hover:bg-wabi-muted"
                  >
                    ▶
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        ))}
        <div className="shrink-0">
          <ProductImageAdder productId={p.id} />
        </div>
      </div>

      {/* 컨트롤 — 재고·월간·노출·수정·삭제 */}
      <div className="flex flex-wrap items-center gap-2 border-t border-wabi-border pt-3">
        <form action={updateStock} className="flex items-center gap-1">
          <input type="hidden" name="id" value={p.id} />
          <label className="text-xs text-wabi-fg-muted">재고</label>
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={p.stock}
            aria-label={`${p.name} 재고 수량`}
            className="w-16 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2 py-1 text-sm outline-none transition-colors focus:border-wabi-fg"
          />
          <SubmitButton
            pendingText="저장 중…"
            className={adminAction({ tone: "outline" })}
          >
            저장
          </SubmitButton>
        </form>

        <form action={toggleMonthly}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="is_monthly" value={String(p.is_monthly)} />
          <SubmitButton
            pendingText="변경 중…"
            className={adminAction({ tone: p.is_monthly ? "solid" : "outline" })}
          >
            {p.is_monthly ? "월간 지정됨" : "월간 지정"}
          </SubmitButton>
        </form>

        <form action={toggleActive}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="is_active" value={String(p.is_active)} />
          <SubmitButton
            pendingText="변경 중…"
            className={adminAction({ tone: p.is_active ? "solid" : "outline" })}
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
  );
}

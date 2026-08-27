import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { won } from "@/lib/orders";
import { isLowStock } from "@/lib/inventory";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  sold_out: boolean;
  is_monthly: boolean;
  images: string[] | null;
};

// 상품 목록 카드(대표님 — 모바일에서 한 화면에 여러 개 보이게, 카드=수정 링크).
// 카드 전체가 /admin/products/[id] 수정 페이지로 이동한다. 재고·사진·삭제 등 관리는
// 수정 페이지에서. 여기선 대표 이미지·이름·가격·상태 뱃지만 간결하게.
export function ProductGridCard({ product: p }: { product: Product }) {
  const cover = p.images?.[0] ?? null;
  // 강제 품절(sold_out) 또는 재고 0 이면 품절 표시(대표님 3상태).
  const soldOut = p.stock <= 0 || p.sold_out;

  return (
    <Link
      href={`/admin/products/${p.id}`}
      className="group block overflow-hidden rounded-xl border border-wabi-border bg-wabi-bg/50 shadow-sm transition-colors hover:border-wabi-fg/40"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
        {p.is_monthly && (
          <span className="absolute left-2 top-2 z-20 rounded-full bg-wabi-fg/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-wabi-bg">
            월간
          </span>
        )}
        {/* 비공개가 우선(손님에게 아예 안 보임) → 그다음 품절. */}
        {!p.is_active ? (
          <span className="absolute right-2 top-2 z-20 rounded-full border border-wabi-border bg-wabi-bg/90 px-2 py-0.5 text-[10px] text-wabi-fg-muted">
            비공개
          </span>
        ) : soldOut ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-xs tracking-wide text-wabi-fg">
            Out of Stock
          </span>
        ) : null}
        {cover ? (
          <Image
            src={cover}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <ImageIcon
            className="size-8 text-wabi-fg-muted/40"
            strokeWidth={1}
            aria-hidden
          />
        )}
      </div>

      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium text-wabi-fg">{p.name}</p>
        <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-wabi-fg">
          {won(p.price)}
          {!soldOut && isLowStock(p.stock) && (
            <span className="rounded-full border border-amber-300 px-1.5 py-0.5 text-[10px] font-normal text-amber-800">
              재고 {p.stock}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

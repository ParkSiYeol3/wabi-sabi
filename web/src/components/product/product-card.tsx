import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { CardImage } from "@/components/product/card-image";
import { Price } from "@/components/product/price";

export interface ProductCardData {
  id: string;
  name: string;
  category?: string;
  price: number;
  image?: string | null;
  href?: string;
  // 재고 (#131) — 목록에서 품절을 표시하기 위해 필요. 없으면(undefined) 표시하지 않는다.
  stock?: number;
  // 강제 품절(대표님) — 재고 수량과 무관하게 품절 표시. 재고 0 과 OR 로 합쳐 판단.
  sold_out?: boolean;
  // 이 달의 상품(is_monthly) — 카드 좌상단에 "이 달" 씰로 특별 표시(대표님). 없으면 미표시.
  isMonthly?: boolean;
}

export function ProductCard({
  product,
  eager = false,
}: {
  product: ProductCardData;
  // 첫 화면(above-the-fold) 카드에만 true — LCP 이미지 지연 발견 방지 (#16 Lighthouse).
  // LCP 후보가 여러 장인 그리드라 preload 대신 loading="eager" (Next 16 이미지 문서 권고).
  eager?: boolean;
}) {
  const href = product.href ?? `/shop/${product.id}`;
  // stock 을 넘기지 않은 호출부(관련상품 등)는 품절 표시를 하지 않는다 — 0 과 undefined 구분.
  // 강제 품절(sold_out)은 재고와 무관하게 품절로 표시(대표님).
  const soldOut =
    (product.stock !== undefined && product.stock <= 0) ||
    product.sold_out === true;

  return (
    <Link href={href} className="group block">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
        {product.isMonthly && (
          // 월간 그릇 씰 — 좌상단, 절제된 강조(espresso 배경·크림 글씨). 품절
          // 오버레이 위(z-20)에 둬 품절이어도 "월간" 표식은 보이게.
          <span className="absolute left-2 top-2 z-20 rounded-full bg-wabi-fg/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-wabi-bg">
            월간
          </span>
        )}
        {soldOut && (
          // 이미지 위 오버레이 — 목록에서 품절을 못 보고 클릭하는 일이 없도록.
          // 라벨은 영문 "Out of Stock"(대표님) — 카드 영문 부제(Bowl·Plate)와 톤 통일.
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm tracking-wide text-wabi-fg">
            Out of Stock
          </span>
        )}
        {product.image ? (
          <CardImage src={product.image} alt={product.name} eager={eager} />
        ) : (
          <ImageIcon
            className="size-8 text-wabi-fg-muted/40"
            strokeWidth={1}
            aria-hidden
          />
        )}
      </div>
      {product.category && (
        <p className="mt-2.5 text-[11px] text-wabi-fg-muted">
          {product.category}
        </p>
      )}
      <p className="mt-1 text-[13px]">{product.name}</p>
      {/* 가격(대표님 — 카드 글씨 전체적으로 작게). 숫자 Cormorant, "원" 작고 흐린 접미(Price) */}
      <p className="mt-0.5 text-base font-semibold text-wabi-fg">
        <Price value={product.price} />
      </p>
    </Link>
  );
}

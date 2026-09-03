import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { CardImage } from "@/components/product/card-image";
import { Price } from "@/components/product/price";
import { isStockSoldOut } from "@/lib/inventory";

export interface ProductCardData {
  id: string;
  name: string;
  category?: string;
  price: number;
  image?: string | null;
  // 두 번째 사진(있으면) — 목록 카드 hover 시 교차 노출(각도 미리보기).
  image2?: string | null;
  href?: string;
  // 재고 (#131) — 목록에서 품절을 표시하기 위해 필요. 없으면(undefined) 표시하지 않는다.
  stock?: number;
  // 강제 품절(대표님) — 재고 수량과 무관하게 품절 표시. 재고 0 과 OR 로 합쳐 판단.
  sold_out?: boolean;
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
  // 강제 품절(sold_out)은 재고와 무관하게 품절로 표시(대표님). 예약분(매장 1개)을
  // 뺀 판매 가능 수량 기준으로 품절 판정(재고 1개 남으면 품절 — 대표님).
  const soldOut =
    (product.stock !== undefined && isStockSoldOut(product.stock)) ||
    product.sold_out === true;

  return (
    <Link href={href} className="group block">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
        {soldOut && (
          // 이미지 위 오버레이 — 목록에서 품절을 못 보고 클릭하는 일이 없도록.
          // 라벨은 영문 "Out of Stock"(대표님) — 카드 영문 부제(Bowl·Plate)와 톤 통일.
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm tracking-wide text-wabi-fg">
            Out of Stock
          </span>
        )}
        {product.image ? (
          <CardImage
            src={product.image}
            src2={product.image2 ?? undefined}
            alt={product.name}
            eager={eager}
          />
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

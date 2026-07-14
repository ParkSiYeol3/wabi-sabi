import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

export interface ProductCardData {
  id: string;
  name: string;
  category?: string;
  price: number;
  image?: string | null;
  href?: string;
  // 재고 (#131) — 목록에서 품절을 표시하기 위해 필요. 없으면(undefined) 표시하지 않는다.
  stock?: number;
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

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
  const soldOut = product.stock !== undefined && product.stock <= 0;

  return (
    <Link href={href} className="group block">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
        {soldOut && (
          // 이미지 위 오버레이 — 목록에서 품절을 못 보고 클릭하는 일이 없도록.
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm tracking-wide text-wabi-fg">
            품절
          </span>
        )}
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            loading={eager ? "eager" : "lazy"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
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
        <p className="mt-3 text-xs text-wabi-fg-muted">{product.category}</p>
      )}
      <p className="mt-1 text-sm">{product.name}</p>
      <p className="text-xs text-wabi-fg-muted">{won(product.price)}</p>
    </Link>
  );
}

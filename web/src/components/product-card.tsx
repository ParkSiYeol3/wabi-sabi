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
  return (
    <Link href={href} className="group block">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
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

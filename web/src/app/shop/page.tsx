import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { categories } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shop",
  description: "WABI-SABI 수공예 도자기·생활 오브제 컬렉션",
};

// TODO(WSB-007): Supabase products 테이블에서 조회로 교체. 현재는 플레이스홀더.
const placeholder: ProductCardData[] = [
  { id: "1", name: "세라믹 볼", category: "Tableware", price: 86000 },
  { id: "2", name: "백자 화병", category: "Objects", price: 45000 },
  { id: "3", name: "백자 볼 세트", category: "Tableware", price: 62000 },
  { id: "4", name: "도자기 스푼", category: "Craft", price: 18000 },
  { id: "5", name: "다기 세트", category: "Tableware", price: 95000 },
  { id: "6", name: "오브제 화병", category: "Objects", price: 52000 },
  { id: "7", name: "수저 세트", category: "Craft", price: 38000 },
  { id: "8", name: "찻잔 세트", category: "Gifts", price: 71000 },
];

export default function ShopPage() {
  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">Shop</h1>

      {/* 카테고리 필터 (TODO: WSB-009 정렬·가격 필터 연동) */}
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="카테고리">
        <button className="border border-wabi-fg px-4 py-1.5 text-xs">
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            className="border border-wabi-border px-4 py-1.5 text-xs text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
          >
            {c.ko} {c.en}
          </button>
        ))}
      </nav>

      <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        {placeholder.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
            <AddToCartButton
              product={{ id: p.id, name: p.name, price: p.price, image: p.image }}
              className="mt-3 w-full"
            />
          </li>
        ))}
      </ul>
    </Container>
  );
}

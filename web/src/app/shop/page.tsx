import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { categories } from "@/lib/site";
import { getProducts } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "WABI-SABI 수공예 도자기·생활 오브제 컬렉션",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await getProducts(category);

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">Shop</h1>

      {/* 카테고리 필터 (WSB-007) */}
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="카테고리">
        <FilterLink href="/shop" active={!category}>
          전체
        </FilterLink>
        {categories.map((c) => (
          <FilterLink
            key={c.slug}
            href={`/shop?category=${c.slug}`}
            active={category === c.slug}
          >
            {c.ko} {c.en}
          </FilterLink>
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          준비 중인 상품입니다.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
              <AddToCartButton
                product={{
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: p.image,
                }}
                className="mt-3 w-full"
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border px-4 py-1.5 text-xs transition-colors",
        active
          ? "border-wabi-fg text-wabi-fg"
          : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg",
      )}
    >
      {children}
    </Link>
  );
}

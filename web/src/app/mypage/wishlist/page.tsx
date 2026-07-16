import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { WishlistButton } from "@/components/wishlist-button";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "위시리스트" };

type Row = {
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
    stock: number | null;
    images: unknown;
  } | null;
};

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/mypage/wishlist");

  const { data } = await supabase
    .from("wishlist")
    .select("product_id, products(id, name, price, stock, images)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const items: ProductCardData[] = (data ?? [])
    .filter((r) => r.products)
    .map((r) => ({
      id: r.products!.id,
      name: r.products!.name,
      price: r.products!.price,
      // PostgREST 는 미관리 컬럼을 null 로 준다. null <= 0 은 true 라 품절로 오판되므로
      // undefined 로 정규화한다(ProductCard·담기 버튼 모두 undefined 는 "미표시"로 처리).
      stock: r.products!.stock ?? undefined,
      image:
        Array.isArray(r.products!.images) &&
        typeof r.products!.images[0] === "string"
          ? (r.products!.images[0] as string)
          : null,
    }));

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">위시리스트</h1>

      {items.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          위시리스트가 비어 있습니다.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((p) => (
            <li key={p.id} className="relative">
              <div className="absolute right-2 top-2 z-10 bg-wabi-bg/80">
                <WishlistButton productId={p.id} initial refreshOnToggle />
              </div>
              <ProductCard product={p} />
              <AddToCartButton
                product={{ id: p.id, name: p.name, price: p.price, image: p.image }}
                soldOut={typeof p.stock === "number" && p.stock <= 0}
                className="mt-3 w-full"
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

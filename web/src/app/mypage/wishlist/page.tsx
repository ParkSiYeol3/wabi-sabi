import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { WishlistButton } from "@/components/wishlist-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "위시리스트" };

type Row = {
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
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
    .select("product_id, products(id, name, price, images)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const items: ProductCardData[] = (data ?? [])
    .filter((r) => r.products)
    .map((r) => ({
      id: r.products!.id,
      name: r.products!.name,
      price: r.products!.price,
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
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

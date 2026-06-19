import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { WishlistButton } from "@/components/wishlist-button";
import { getProduct, getRelatedProducts } from "@/lib/queries/products";
import { createClient } from "@/lib/supabase/server";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "상품을 찾을 수 없음" };
  return {
    title: product.name,
    description: product.description ?? `${product.name} — WABI-SABI`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // 위시리스트 초기 상태 (로그인 시)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let wished = false;
  if (user) {
    const { data } = await supabase
      .from("wishlist")
      .select("id")
      .eq("product_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    wished = !!data;
  }

  const related = product.category
    ? await getRelatedProducts(product.category.slug, product.id)
    : [];

  const main = product.images[0] ?? null;
  const specs = [
    { label: "소재", value: product.material },
    { label: "사이즈", value: product.size },
    { label: "주의사항", value: product.care },
  ].filter((s) => s.value);

  return (
    <Container className="py-16">
      <div className="grid gap-12 md:grid-cols-2">
        {/* 이미지 */}
        <div>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
            {main ? (
              <Image
                src={main}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <ImageIcon
                className="size-12 text-wabi-fg-muted/40"
                strokeWidth={1}
                aria-hidden
              />
            )}
          </div>
          {product.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-4 gap-3">
              {product.images.slice(0, 4).map((src, i) => (
                <li
                  key={i}
                  className="relative aspect-square overflow-hidden bg-wabi-muted"
                >
                  <Image
                    src={src}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 정보 */}
        <div>
          {product.category && (
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="text-xs text-wabi-fg-muted hover:text-wabi-fg"
            >
              {product.category.name_en}
            </Link>
          )}
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <WishlistButton productId={product.id} initial={wished} />
          </div>
          <p className="mt-4 text-xl">{won(product.price)}</p>

          {product.description && (
            <p className="mt-6 text-sm leading-7 text-wabi-fg-muted">
              {product.description}
            </p>
          )}

          <ProductDetailActions
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              image: main,
            }}
            stock={product.stock}
          />

          {specs.length > 0 && (
            <dl className="mt-10 divide-y divide-wabi-border border-t border-wabi-border text-sm">
              {specs.map((s) => (
                <div key={s.label} className="flex gap-4 py-3">
                  <dt className="w-20 shrink-0 text-wabi-fg-muted">
                    {s.label}
                  </dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {/* 관련 상품 (WSB-012) */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-lg font-medium">관련 상품</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}

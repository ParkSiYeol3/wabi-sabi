import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/container";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { getProduct } from "@/lib/queries/products";

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
          <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
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
    </Container>
  );
}

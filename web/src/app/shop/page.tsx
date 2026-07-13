import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Input } from "@/components/ui/input";
import { categories, MONTHLY_SLUG } from "@/lib/site";
import { getProducts, type ProductSort } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "WABI-SABI 수공예 도자기·생활 오브제 컬렉션",
};

const sorts: { key: ProductSort; label: string }[] = [
  { key: "newest", label: "신상품순" },
  { key: "price_asc", label: "낮은가격순" },
  { key: "price_desc", label: "높은가격순" },
];

type SP = { category?: string; q?: string; sort?: string };

function buildQuery(base: SP, override: Partial<SP>): string {
  const merged = { ...base, ...override };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.q) params.set("q", merged.q);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  const s = params.toString();
  return s ? `/shop?${s}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort as ProductSort) || "newest";
  const products = await getProducts({ category: sp.category, q: sp.q, sort });

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">Shop</h1>

      {/* 검색 (WSB-008) */}
      <form action="/shop" className="mt-8 flex max-w-sm gap-2">
        {sp.category && (
          <input type="hidden" name="category" value={sp.category} />
        )}
        {sp.sort && sp.sort !== "newest" && (
          <input type="hidden" name="sort" value={sp.sort} />
        )}
        <Input
          name="q"
          type="search"
          defaultValue={sp.q ?? ""}
          placeholder="상품 검색"
          aria-label="상품 검색"
          className="rounded-none"
        />
        <button
          type="submit"
          aria-label="검색"
          className="flex items-center justify-center bg-wabi-accent px-4 text-white hover:bg-wabi-accent/90"
        >
          <Search className="size-4" />
        </button>
      </form>

      {/* 카테고리 (WSB-007) */}
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="카테고리">
        <FilterLink href={buildQuery(sp, { category: undefined })} active={!sp.category}>
          전체
        </FilterLink>
        <FilterLink
          href={buildQuery(sp, { category: MONTHLY_SLUG })}
          active={sp.category === MONTHLY_SLUG}
        >
          이 달의 상품
        </FilterLink>
        {categories.map((c) => (
          <FilterLink
            key={c.slug}
            href={buildQuery(sp, { category: c.slug })}
            active={sp.category === c.slug}
          >
            {c.ko} {c.en}
          </FilterLink>
        ))}
      </nav>

      {/* 정렬 (WSB-009) */}
      <div className="mt-4 flex gap-4 text-xs">
        {sorts.map((s) => (
          <Link
            key={s.key}
            href={buildQuery(sp, { sort: s.key })}
            className={cn(
              "transition-colors",
              sort === s.key
                ? "font-medium text-wabi-fg"
                : "text-wabi-fg-muted hover:text-wabi-fg",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          {sp.q ? `'${sp.q}' 검색 결과가 없습니다.` : "준비 중인 상품입니다."}
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id}>
              {/* 첫 줄(모바일 2·데스크톱 4칸)은 eager 로드 — LCP 후보 */}
              <ProductCard product={p} eager={i < 4} />
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

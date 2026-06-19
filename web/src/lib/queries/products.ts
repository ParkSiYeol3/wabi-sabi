import { createClient } from "@/lib/supabase/server";
import type { ProductCardData } from "@/components/product-card";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  images: unknown;
  categories: { slug: string; name_en: string } | null;
};

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

// WSB-007: 카테고리별 상품 조회 (공개 — RLS는 is_active=true 만 노출).
export async function getProducts(
  categorySlug?: string,
): Promise<ProductCardData[]> {
  const supabase = await createClient();

  let categoryId: string | undefined;
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (!cat) return [];
    categoryId = cat.id;
  }

  let query = supabase
    .from("products")
    .select("id, name, price, images, categories(slug, name_en)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query.returns<ProductRow[]>();
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: firstImage(p.images),
    category: p.categories?.name_en,
  }));
}

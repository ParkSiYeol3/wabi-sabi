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

function imageList(images: unknown): string[] {
  return Array.isArray(images)
    ? images.filter((i): i is string => typeof i === "string")
    : [];
}

export interface ProductDetail {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  material: string | null;
  size: string | null;
  care: string | null;
  images: string[];
  category: { slug: string; name_en: string; name_ko: string } | null;
}

// WSB-010: 상품 상세 단건 조회 (없거나 비활성 → null).
export async function getProduct(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, stock, description, material, size, care, images, categories(slug, name_en, name_ko)",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    name: string;
    price: number;
    stock: number;
    description: string | null;
    material: string | null;
    size: string | null;
    care: string | null;
    images: unknown;
    categories: { slug: string; name_en: string; name_ko: string } | null;
  };
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
    description: row.description,
    material: row.material,
    size: row.size,
    care: row.care,
    images: imageList(row.images),
    category: row.categories,
  };
}

export type ProductSort = "newest" | "price_asc" | "price_desc";

export interface ProductQuery {
  category?: string;
  q?: string;
  sort?: ProductSort;
}

// WSB-007/008/009: 카테고리·검색·정렬 (공개 — RLS는 is_active=true 만 노출).
export async function getProducts({
  category,
  q,
  sort = "newest",
}: ProductQuery = {}): Promise<ProductCardData[]> {
  const supabase = await createClient();

  let categoryId: string | undefined;
  if (category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .single();
    if (!cat) return [];
    categoryId = cat.id;
  }

  let query = supabase
    .from("products")
    .select("id, name, price, images, categories(slug, name_en)")
    .eq("is_active", true);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);

  // 정렬
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

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

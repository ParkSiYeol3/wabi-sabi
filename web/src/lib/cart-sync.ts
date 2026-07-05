import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/store/cart";

// 계정 장바구니 서버 동기화 (0015). 사용자 클라이언트로 본인 행만 CRUD(RLS).
// 저장은 product_id+quantity, 표시 정보는 products 조인으로 최신값 사용.

type CartRow = {
  product_id: string;
  quantity: number;
  products: {
    name: string;
    price: number;
    images: string[] | null;
    is_active: boolean;
  } | null;
};

// 서버 장바구니 로드 → CartItem[]. 비활성/삭제 상품은 제외(자동 정리).
export async function loadServerCart(): Promise<CartItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity, products(name, price, images, is_active)")
    .order("updated_at", { ascending: true })
    .returns<CartRow[]>();
  if (error || !data) return [];
  return data
    .filter((r) => r.products && r.products.is_active)
    .map((r) => ({
      id: r.product_id,
      name: r.products!.name,
      price: r.products!.price,
      image: r.products!.images?.[0] ?? null,
      quantity: r.quantity,
    }));
}

// 수량 설정(upsert). qty<=0 이면 삭제.
export async function upsertServerItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const supabase = createClient();
  if (quantity <= 0) {
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    return;
  }
  await supabase.from("cart_items").upsert(
    {
      user_id: userId,
      product_id: productId,
      quantity: Math.min(quantity, 99),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" },
  );
}

export async function removeServerItem(
  userId: string,
  productId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
}

export async function clearServerCart(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("cart_items").delete().eq("user_id", userId);
}

// 로그인 시 게스트(로컬) 장바구니를 서버에 병합 후, 병합된 서버 장바구니를 반환.
// 같은 상품은 수량 합산(상한 99). 병합 대상이 없으면 서버 로드만 수행.
export async function mergeGuestCart(
  userId: string,
  guest: CartItem[],
): Promise<CartItem[]> {
  if (guest.length > 0) {
    const supabase = createClient();
    // 현재 서버 수량 조회(합산용)
    const { data: existing } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("user_id", userId)
      .returns<{ product_id: string; quantity: number }[]>();
    const serverQty = new Map(
      (existing ?? []).map((r) => [r.product_id, r.quantity]),
    );

    const rows = guest.map((g) => ({
      user_id: userId,
      product_id: g.id,
      quantity: Math.min((serverQty.get(g.id) ?? 0) + g.quantity, 99),
      updated_at: new Date().toISOString(),
    }));
    await supabase
      .from("cart_items")
      .upsert(rows, { onConflict: "user_id,product_id" });
  }
  return loadServerCart();
}

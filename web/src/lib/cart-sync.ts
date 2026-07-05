import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/store/cart";

// 계정 장바구니 서버 동기화 (0015). 사용자 클라이언트로 본인 행만 CRUD(RLS).
// 저장은 product_id+quantity, 표시 정보는 products 조인으로 최신값 사용.

// 사용자별 순차 큐 — write-through 를 한 체인으로 직렬화해 순서를 보장한다.
// fire-and-forget 로 빠르게 연속 조작하면 요청이 뒤바뀌어 로컬↔서버가 어긋날
// 수 있음(예: add 직후 remove 가 뒤집히면 서버에 유령 항목이 남음).
const writeChains = new Map<string, Promise<unknown>>();

export function enqueueCartWrite(
  userId: string,
  op: () => Promise<void>,
): Promise<void> {
  const prev = writeChains.get(userId) ?? Promise.resolve();
  const next = prev.then(op).catch((e) => {
    // 실패는 삼키지 않고 로그 — 다음 loadServerCart(로그인/새로고침)에서 교정된다.
    console.error("[cart-sync] 서버 반영 실패", e);
  });
  writeChains.set(userId, next);
  return next;
}

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
  if (error) throw error;
  if (!data) return [];
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

// 수량 설정(upsert). qty<=0 이면 삭제. 에러는 throw(호출 큐가 로깅).
export async function upsertServerItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const supabase = createClient();
  if (quantity <= 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("cart_items").upsert(
    {
      user_id: userId,
      product_id: productId,
      quantity: Math.min(quantity, 99),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" },
  );
  if (error) throw error;
}

export async function removeServerItem(
  userId: string,
  productId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function clearServerCart(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
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
    const { data: existing, error: readErr } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("user_id", userId)
      .returns<{ product_id: string; quantity: number }[]>();
    if (readErr) throw readErr;
    const serverQty = new Map(
      (existing ?? []).map((r) => [r.product_id, r.quantity]),
    );

    const rows = guest.map((g) => ({
      user_id: userId,
      product_id: g.id,
      quantity: Math.min((serverQty.get(g.id) ?? 0) + g.quantity, 99),
      updated_at: new Date().toISOString(),
    }));
    const { error: writeErr } = await supabase
      .from("cart_items")
      .upsert(rows, { onConflict: "user_id,product_id" });
    if (writeErr) throw writeErr;
  }
  return loadServerCart();
}

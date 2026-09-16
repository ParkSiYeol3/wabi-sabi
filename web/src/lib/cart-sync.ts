import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/store/cart";
import { cartLineKey } from "@/lib/cart-line";
import { parseSelectedOptions, type SelectedOption } from "@/lib/product-options";

// 계정 장바구니 서버 동기화 (0015). 사용자 클라이언트로 본인 행만 CRUD(RLS).
// 저장은 line_key(#677, 0064) + product_id + quantity, 표시 정보는 products 조인으로
// 최신값 사용. 줄의 신원은 line_key — 같은 상품이라도 옵션이 다르면 다른 행이다.

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
  line_key: string | null;
  product_id: string;
  quantity: number;
  addons: string[] | null;
  options: unknown;
  products: {
    name: string;
    price: number;
    images: string[] | null;
    is_active: boolean;
  } | null;
};

const SELECT =
  "line_key, product_id, quantity, addons, options, products(name, price, images, is_active)";

// 서버 장바구니 로드 → CartItem[]. 비활성/삭제 상품은 제외(자동 정리).
export async function loadServerCart(): Promise<CartItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select(SELECT)
    .order("updated_at", { ascending: true })
    .returns<CartRow[]>();
  if (error) throw error;
  if (!data) return [];
  return data
    .filter((r) => r.products && r.products.is_active)
    .map((r) => {
      const addons = Array.isArray(r.addons) ? r.addons : [];
      const options = parseSelectedOptions(r.options);
      return {
        id: r.product_id,
        name: r.products!.name,
        price: r.products!.price,
        image: r.products!.images?.[0] ?? null,
        quantity: r.quantity,
        addons,
        options,
        // 0064 이전 행은 line_key 가 product_id 로 백필돼 있다. 옵션이 붙은 행이면
        // 규칙대로 다시 만들어 클라이언트 키와 어긋나지 않게 한다.
        lineKey: r.line_key || cartLineKey(r.product_id, options, addons),
      };
    });
}

// 수량 설정(upsert). qty<=0 이면 삭제. 에러는 throw(호출 큐가 로깅).
export async function upsertServerItem(
  userId: string,
  lineKey: string,
  productId: string,
  quantity: number,
  addons: string[] = [],
  options: SelectedOption[] = [],
): Promise<void> {
  const supabase = createClient();
  if (quantity <= 0) {
    await removeServerItem(userId, lineKey);
    return;
  }
  const { error } = await supabase.from("cart_items").upsert(
    {
      user_id: userId,
      line_key: lineKey,
      product_id: productId,
      quantity: Math.min(quantity, 99),
      addons,
      options,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,line_key" },
  );
  if (error) throw error;
}

export async function removeServerItem(
  userId: string,
  lineKey: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("line_key", lineKey);
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
// 같은 줄(상품+옵션 조합)이면 수량 합산(상한 99). 병합 대상이 없으면 서버 로드만 수행.
export async function mergeGuestCart(
  userId: string,
  guest: CartItem[],
): Promise<CartItem[]> {
  if (guest.length > 0) {
    const supabase = createClient();
    // 현재 서버 수량 조회(합산용)
    const { data: existing, error: readErr } = await supabase
      .from("cart_items")
      .select("line_key, product_id, quantity")
      .eq("user_id", userId)
      .returns<{ line_key: string | null; product_id: string; quantity: number }[]>();
    if (readErr) throw readErr;
    const serverQty = new Map(
      (existing ?? []).map((r) => [r.line_key || r.product_id, r.quantity]),
    );

    const rows = guest.map((g) => {
      const lineKey = g.lineKey || cartLineKey(g.id, g.options, g.addons);
      return {
        user_id: userId,
        line_key: lineKey,
        product_id: g.id,
        quantity: Math.min((serverQty.get(lineKey) ?? 0) + g.quantity, 99),
        addons: g.addons ?? [],
        options: g.options ?? [],
        updated_at: new Date().toISOString(),
      };
    });
    const { error: writeErr } = await supabase
      .from("cart_items")
      .upsert(rows, { onConflict: "user_id,line_key" });
    if (writeErr) throw writeErr;
  }
  return loadServerCart();
}

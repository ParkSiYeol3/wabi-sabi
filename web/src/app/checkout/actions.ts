"use server";

import { createClient } from "@/lib/supabase/server";

const GIFT_PRICE = 3000;

export type CartLine = { id: string; quantity: number };
export type DeliveryInput = {
  recipient: string;
  phone: string;
  postcode?: string;
  address: string;
  detail?: string;
  memo?: string;
};
export type GiftInput = { enabled: boolean; sender?: string; message?: string };

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: number; orderName: string }
  | { ok: false; error: string };

// 주문 생성(status=pending). 금액은 DB 가격으로 재계산(클라이언트 값 불신).
export async function createPendingOrder(
  lines: CartLine[],
  delivery: DeliveryInput,
  gift: GiftInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (lines.length === 0) return { ok: false, error: "장바구니가 비었습니다." };
  if (!delivery.recipient || !delivery.phone || !delivery.address)
    return { ok: false, error: "배송지를 입력해 주세요." };

  // 남용 가드(rate limit) — 외부 인프라 없이 DB 기준:
  // ① 미결제(pending) 5건 이상 → 차단(방치 주문은 일일 cron 정리)
  // ② 최근 1시간 주문 생성 10건 이상 → 차단
  const { count: pendingCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  if ((pendingCount ?? 0) >= 5)
    return {
      ok: false,
      error: "미결제 주문이 많습니다. 기존 주문을 결제하거나 잠시 후 다시 시도해 주세요.",
    };
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("ordered_at", hourAgo);
  if ((recentCount ?? 0) >= 10)
    return { ok: false, error: "주문 시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요." };

  const ids = lines.map((l) => l.id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .in("id", ids)
    .eq("is_active", true);
  if (!products || products.length === 0)
    return { ok: false, error: "상품 정보를 찾을 수 없습니다." };

  const priceMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  const items: {
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
  }[] = [];
  for (const line of lines) {
    const p = priceMap.get(line.id);
    if (!p) return { ok: false, error: "유효하지 않은 상품이 있습니다." };
    if (p.stock < line.quantity)
      return { ok: false, error: `'${p.name}' 재고가 부족합니다.` };
    subtotal += p.price * line.quantity;
    items.push({
      product_id: p.id,
      product_name: p.name,
      price: p.price,
      quantity: line.quantity,
    });
  }
  const amount = subtotal + (gift.enabled ? GIFT_PRICE : 0);

  const orderNumber = `WSB${Date.now().toString(36).toUpperCase()}`;
  const fullAddress = [delivery.postcode, delivery.address, delivery.detail]
    .filter(Boolean)
    .join(" ");

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      status: "pending",
      total_price: amount,
      recipient: delivery.recipient,
      phone: delivery.phone,
      address: fullAddress,
      delivery_memo: delivery.memo || null,
    })
    .select("id")
    .single();
  if (orderErr || !order)
    return { ok: false, error: "주문 생성에 실패했습니다." };

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(items.map((it) => ({ ...it, order_id: order.id })));
  if (itemsErr) return { ok: false, error: "주문 항목 저장에 실패했습니다." };

  if (gift.enabled) {
    await supabase.from("gift_options").insert({
      order_id: order.id,
      package_type: "gift",
      extra_price: GIFT_PRICE,
      sender_name: gift.sender || null,
      message: gift.message || null,
    });
  }

  const first = items[0];
  const orderName =
    items.length > 1
      ? `${first.product_name} 외 ${items.length - 1}건`
      : first.product_name;

  return { ok: true, orderId: order.id, amount, orderName };
}

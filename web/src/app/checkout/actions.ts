"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  addonsTotal,
  addonSnapshot,
  resolveAddons,
  GIFT_WRAP_CODE,
} from "@/lib/addons";

// 입력 스키마 (보안_체크리스트 P1 입력 검증) — 서버 액션은 공개 엔드포인트,
// 폼을 거치지 않은 임의 페이로드(음수 수량·초대형 문자열 등)를 여기서 차단.
const cartLineSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  // 라인 단위 추가 옵션 코드(#253). 가격은 서버 addons.ts 정가로 재계산(불신).
  addons: z.array(z.string().trim().max(40)).max(10).default([]),
});
// 중복 상품 id 거부 — 같은 상품을 여러 줄로 쪼개면 라인별 재고 체크를
// 우회해 재고 이상 주문 가능(줄마다 stock ≥ qty 만 검사되므로).
const linesSchema = z
  .array(cartLineSchema)
  .min(1)
  .max(30)
  .refine(
    (ls) => new Set(ls.map((l) => l.id)).size === ls.length,
    "중복 상품이 있습니다.",
  );
const deliverySchema = z.object({
  recipient: z.string().trim().min(1).max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-]{9,13}$/, "전화번호 형식이 올바르지 않습니다."),
  postcode: z.string().trim().max(10).optional(),
  address: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(100).optional(),
  memo: z.string().trim().max(200).optional(),
});
// 선물 메시지(#253) — 애드온은 이제 라인 단위(cartLineSchema.addons)라, 결제
// 화면은 주문당 1개인 선물 메시지·보내는 분만 받는다(선물 포장 라인이 있을 때).
const giftMessageSchema = z.object({
  sender: z.string().trim().max(50).optional(),
  message: z.string().trim().max(300).optional(),
});

export type CartLine = z.infer<typeof cartLineSchema>;
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type GiftMessageInput = z.infer<typeof giftMessageSchema>;

export type SavedAddress = {
  id: string;
  recipient: string;
  phone: string;
  postcode: string | null;
  address: string;
  detail: string | null;
};

// 본인 저장 배송지 (#162) — 결제 시 자동 채움용. RLS(addresses 소유자 전용)로
// 타인 주소는 조회되지 않는다. 최신순.
export async function getMyAddresses(): Promise<SavedAddress[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("addresses")
    .select("id, recipient, phone, postcode, address, detail")
    .order("created_at", { ascending: false })
    .returns<SavedAddress[]>();
  return data ?? [];
}

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: number; orderName: string }
  | { ok: false; error: string };

// 주문 생성(status=pending). 금액은 DB 가격으로 재계산(클라이언트 값 불신).
export async function createPendingOrder(
  linesInput: CartLine[],
  deliveryInput: DeliveryInput,
  giftInput: GiftMessageInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  // 주문 쓰기는 서버 전용(0012 에서 사용자 insert 정책 회수) — service_role 필수
  if (!adminConfigured())
    return { ok: false, error: "주문 처리를 위한 서버 설정이 없습니다." };
  const admin = createAdminClient();

  // 스키마 검증 — 클라이언트 페이로드 불신
  const linesParsed = linesSchema.safeParse(linesInput);
  if (!linesParsed.success)
    return { ok: false, error: "장바구니 정보가 올바르지 않습니다." };
  const deliveryParsed = deliverySchema.safeParse(deliveryInput);
  if (!deliveryParsed.success)
    return {
      ok: false,
      error:
        deliveryParsed.error.issues[0]?.message === "전화번호 형식이 올바르지 않습니다."
          ? "전화번호 형식이 올바르지 않습니다."
          : "배송지를 올바르게 입력해 주세요.",
    };
  const giftParsed = giftMessageSchema.safeParse(giftInput);
  if (!giftParsed.success)
    return { ok: false, error: "선물 메시지가 올바르지 않습니다." };
  const lines = linesParsed.data;
  const delivery = deliveryParsed.data;
  const gift = giftParsed.data;

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
  let giftSelected = false;
  const items: {
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
    addons: { code: string; name: string; price: number }[];
  }[] = [];
  for (const line of lines) {
    const p = priceMap.get(line.id);
    if (!p) return { ok: false, error: "유효하지 않은 상품이 있습니다." };
    if (p.stock < line.quantity)
      return { ok: false, error: `'${p.name}' 재고가 부족합니다.` };
    // 애드온 금액은 서버 정가(addons.ts)로 재계산 — 클라이언트가 준 값 불신.
    // 라인당 1세트라 수량과 무관하게 라인 1회 부과. 스냅샷으로 주문 시점 고정.
    const lineAddons = addonSnapshot(line.addons);
    const lineAddonTotal = addonsTotal(line.addons);
    if (resolveAddons(line.addons).some((a) => a.code === GIFT_WRAP_CODE))
      giftSelected = true;
    subtotal += p.price * line.quantity + lineAddonTotal;
    items.push({
      product_id: p.id,
      product_name: p.name,
      price: p.price,
      quantity: line.quantity,
      addons: lineAddons,
    });
  }
  // 라인별 애드온이 subtotal 에 이미 합산됐다(서버 정가 기준).
  const amount = subtotal;

  const orderNumber = `WSB${Date.now().toString(36).toUpperCase()}`;
  const fullAddress = [delivery.postcode, delivery.address, delivery.detail]
    .filter(Boolean)
    .join(" ");

  // 쓰기는 service_role — 사용자 직접 insert 는 0012 로 차단됨(#62).
  // user_id 는 서버 세션에서 확정하므로 위조 불가.
  const { data: order, error: orderErr } = await admin
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

  const { error: itemsErr } = await admin
    .from("order_items")
    .insert(items.map((it) => ({ ...it, order_id: order.id })));
  if (itemsErr) {
    // 항목 없는 고아 주문 즉시 정리(결제 전이라 안전) — cron 대기 불필요
    await admin.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "주문 항목 저장에 실패했습니다." };
  }

  // 선물 포장이 담긴 라인이 있으면 메시지·보내는 분(gift_options — 주문당 1행,
  // 메시지는 주문 단위). 저장 실패를 성공으로 넘기면 포장비는 청구됐는데
  // 메시지가 유실되므로 주문을 정리하고 실패 반환(결제 전이라 안전).
  if (giftSelected) {
    const giftPrice = items
      .flatMap((it) => it.addons)
      .find((a) => a.code === GIFT_WRAP_CODE)?.price;
    const { error: giftErr } = await admin.from("gift_options").insert({
      order_id: order.id,
      package_type: GIFT_WRAP_CODE,
      extra_price: giftPrice ?? 0,
      sender_name: gift.sender || null,
      message: gift.message || null,
    });
    if (giftErr) {
      await admin.from("orders").delete().eq("id", order.id);
      return { ok: false, error: "선물 포장 정보 저장에 실패했습니다." };
    }
  }

  const first = items[0];
  const orderName =
    items.length > 1
      ? `${first.product_name} 외 ${items.length - 1}건`
      : first.product_name;

  return { ok: true, orderId: order.id, amount, orderName };
}

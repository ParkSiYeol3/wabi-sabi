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
import { shippingFeeFor } from "@/lib/shipping";
import { availableStock } from "@/lib/inventory";
import {
  couponDiscount,
  couponUsable,
  COUPONS_ENABLED,
  type Coupon,
} from "@/lib/coupons";
import {
  parseOptionGroups,
  validateSelection,
  type SelectedOption,
} from "@/lib/product-options";

// 입력 스키마 (보안_체크리스트 P1 입력 검증) — 서버 액션은 공개 엔드포인트,
// 폼을 거치지 않은 임의 페이로드(음수 수량·초대형 문자열 등)를 여기서 차단.
const cartLineSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  // 라인 단위 추가 옵션 코드(#253). 가격은 서버 addons.ts 정가로 재계산(불신).
  addons: z.array(z.string().trim().max(40)).max(10).default([]),
  // 커스텀 옵션 선택(색상·모양 등, 0048). 상품 정의와 대조 검증(validateSelection).
  options: z
    .array(
      z.object({
        name: z.string().trim().max(40),
        value: z.string().trim().max(60),
      }),
    )
    .max(8)
    .default([]),
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

// 내 쿠폰(0059) — 지갑의 미사용·유효(활성·기간·총한도) 쿠폰. 최소주문 판정은
// 클라이언트가 현재 subtotal 로 하고(couponUsable), 여기선 확정적으로 못 쓰는 것만 뺀다.
export async function getMyCoupons(): Promise<Coupon[]> {
  if (!COUPONS_ENABLED) return []; // 준비 상태 — 손님에게 미노출
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_coupons")
    .select("coupons(*)")
    .eq("user_id", user.id)
    .is("used_at", null);
  const now = new Date();
  return ((data ?? []) as unknown as { coupons: Coupon | null }[])
    .map((r) => r.coupons)
    .filter((c): c is Coupon => !!c)
    .filter(
      (c) =>
        c.is_active &&
        (!c.starts_at || new Date(c.starts_at) <= now) &&
        (!c.expires_at || new Date(c.expires_at) >= now) &&
        (c.max_uses == null || c.used_count < c.max_uses),
    );
}

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: number; orderName: string }
  | { ok: false; error: string };

// 주문 생성(status=pending). 금액은 DB 가격으로 재계산(클라이언트 값 불신).
export async function createPendingOrder(
  linesInput: CartLine[],
  deliveryInput: DeliveryInput,
  giftInput: GiftMessageInput,
  couponId?: string | null,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 비회원도 주문 가능(대표님) — 로그인 게이트 없음. user 가 null 이면 게스트 주문
  // (user_id null)으로 진행한다. 남용 가드는 아래에서 회원=user_id / 비회원=전화번호.
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
  // 회원은 user_id, 비회원은 전화번호(+user_id null) 기준으로 집계한다. 비회원 주문은
  // RLS(본인 전용)로 사용자 클라이언트에선 조회되지 않으므로 admin(service_role)으로 센다.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const scopePending = admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: pendingCount } = await (user
    ? scopePending.eq("user_id", user.id)
    : scopePending.is("user_id", null).eq("phone", delivery.phone));
  if ((pendingCount ?? 0) >= 5)
    return {
      ok: false,
      error: "미결제 주문이 많습니다. 기존 주문을 결제하거나 잠시 후 다시 시도해 주세요.",
    };
  const scopeRecent = admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("ordered_at", hourAgo);
  const { count: recentCount } = await (user
    ? scopeRecent.eq("user_id", user.id)
    : scopeRecent.is("user_id", null).eq("phone", delivery.phone));
  if ((recentCount ?? 0) >= 10)
    return { ok: false, error: "주문 시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요." };

  const ids = lines.map((l) => l.id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, stock, sold_out, options, stock_option")
    .in("id", ids)
    .eq("is_active", true);
  if (!products || products.length === 0)
    return { ok: false, error: "상품 정보를 찾을 수 없습니다." };

  const priceMap = new Map(products.map((p) => [p.id, p]));

  // 옵션 값별 재고·가격(0058·0061) — stock_option 이 지정된 상품은 flat stock 대신
  // 선택 값의 재고로 판매 가능 여부를 판정하고, 값에 가격이 있으면 그 가격으로 판다
  // (사이즈 M/L 처럼 값마다 금액이 다름 — 대표님). 관리 상품이 있을 때만 조회.
  // 키는 `id::value`. 가격은 서버가 DB 에서 다시 읽어 쓴다 — 클라이언트 값 불신.
  const managedIds = products
    .filter((p) => p.stock_option)
    .map((p) => p.id);
  const optionStock = new Map<string, number>();
  const optionPrice = new Map<string, number>();
  if (managedIds.length > 0) {
    const { data: rows } = await supabase
      .from("product_option_stock")
      .select("product_id, value, stock, price")
      .in("product_id", managedIds);
    for (const r of rows ?? []) {
      optionStock.set(`${r.product_id}::${r.value}`, r.stock);
      if (typeof r.price === "number")
        optionPrice.set(`${r.product_id}::${r.value}`, r.price);
    }
  }
  let subtotal = 0;
  let giftSelected = false;
  const items: {
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
    addons: { code: string; name: string; price: number }[];
    options: SelectedOption[];
  }[] = [];
  for (const line of lines) {
    const p = priceMap.get(line.id);
    if (!p) return { ok: false, error: "유효하지 않은 상품이 있습니다." };
    // 강제 품절(대표님) — 재고가 있어도 판매 잠금. 서버에서 구매 차단.
    if (p.sold_out)
      return { ok: false, error: `'${p.name}'은(는) 현재 품절입니다.` };
    // 재고 검증 — 옵션 관리 상품은 선택 값의 재고로, 아니면 flat stock 으로.
    // (선택 값은 아래 validateSelection 이 필수로 강제하므로 존재가 보장된다.)
    // 판매 가능 수량 = 실재고 − 매장 예약분(대표님: 재고 1개는 매장에 남긴다).
    // 값별 가격(0061) — 변형 그룹에서 고른 값에 가격이 있으면 그 가격, 없으면 기본가.
    let unitPrice = p.price;
    if (p.stock_option) {
      const selected = line.options.find(
        (o) => o.name === p.stock_option,
      )?.value;
      const available = selected
        ? availableStock(optionStock.get(`${p.id}::${selected}`) ?? 0)
        : 0;
      if (available < line.quantity)
        return {
          ok: false,
          error: `'${p.name}'${selected ? ` (${selected})` : ""} 재고가 부족합니다.`,
        };
      if (selected) unitPrice = optionPrice.get(`${p.id}::${selected}`) ?? p.price;
    } else if (availableStock(p.stock) < line.quantity) {
      return { ok: false, error: `'${p.name}' 재고가 부족합니다.` };
    }
    // 커스텀 옵션(0048) — 상품 정의와 대조. 정의된 그룹은 모두 유효값이 선택돼야
    // 한다(대표님이 색상 모르는 주문 방지). 서버가 진실 — 클라이언트 값 불신.
    const optionCheck = validateSelection(parseOptionGroups(p.options), line.options);
    if (!optionCheck.ok)
      return { ok: false, error: `'${p.name}'의 ${optionCheck.missing} 옵션을 선택해 주세요.` };
    // 애드온 금액은 서버 정가(addons.ts)로 재계산 — 클라이언트가 준 값 불신.
    // 라인당 1세트라 수량과 무관하게 라인 1회 부과. 스냅샷으로 주문 시점 고정.
    const lineAddons = addonSnapshot(line.addons);
    const lineAddonTotal = addonsTotal(line.addons);
    if (resolveAddons(line.addons).some((a) => a.code === GIFT_WRAP_CODE))
      giftSelected = true;
    subtotal += unitPrice * line.quantity + lineAddonTotal;
    items.push({
      product_id: p.id,
      product_name: p.name,
      // 주문 스냅샷은 실제 판매가(값별 가격 반영) — 주문내역·메일이 이 값을 쓴다.
      price: unitPrice,
      quantity: line.quantity,
      addons: lineAddons,
      options: optionCheck.options,
    });
  }
  // 라인별 애드온이 subtotal 에 이미 합산됐다(서버 정가 기준).
  // 배송비 — 서버가 정책(lib/shipping)으로 재계산해 합산. 클라이언트가 준 값 불신.
  // total_price 에 포함되므로 confirm_order_paid·토스 승인이 전액을 검증한다.
  const shippingFee = shippingFeeFor(subtotal);

  // 쿠폰(0059) — 로그인 사용자의 지갑에 있는 미사용·유효 쿠폰만 적용. 할인은 subtotal
  // 에만(배송비 제외). 서버가 정의를 다시 조회해 할인액을 재계산한다(클라 값 불신).
  let discount = 0;
  let appliedCouponId: string | null = null;
  if (couponId && user && COUPONS_ENABLED) {
    const { data: wallet } = await admin
      .from("user_coupons")
      .select("id, coupons(*)")
      .eq("user_id", user.id)
      .eq("coupon_id", couponId)
      .is("used_at", null)
      .maybeSingle();
    const coupon = (wallet?.coupons ?? null) as Coupon | null;
    if (!wallet || !coupon)
      return { ok: false, error: "사용할 수 없는 쿠폰입니다." };
    const usable = couponUsable(coupon, subtotal);
    if (!usable.ok) return { ok: false, error: usable.reason };
    discount = couponDiscount(coupon, subtotal);
    appliedCouponId = coupon.id;
  }

  const amount = subtotal + shippingFee - discount;

  const orderNumber = `WSB${Date.now().toString(36).toUpperCase()}`;
  const fullAddress = [delivery.postcode, delivery.address, delivery.detail]
    .filter(Boolean)
    .join(" ");

  // 쓰기는 service_role — 사용자 직접 insert 는 0012 로 차단됨(#62).
  // user_id 는 서버 세션에서 확정하므로 위조 불가(비회원이면 null — 게스트 주문).
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      order_number: orderNumber,
      status: "pending",
      total_price: amount,
      shipping_fee: shippingFee,
      coupon_id: appliedCouponId,
      discount,
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

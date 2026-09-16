import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

// 쿠폰(0059·0066) — 할인 계산·사용 가능 판정 공용. 서버가 진실이라 checkout/actions 가
// 이 로직으로 재계산해 total_price 를 확정한다(클라이언트 값 불신). 표시용으로 클라
// 요약에서도 같은 함수를 쓴다.

// 쿠폰 기능 노출 스위치. 대표님이 가입 축하 쿠폰(WELCOME2026)을 만들고 적용을
// 요청해 켠다(#680). 끄면 고객 경로 전부 차단(체크아웃 선택 UI·할인·마이페이지 '내 쿠폰').
export const COUPONS_ENABLED = true;

// fixed=정액(원) · percent=정률(%) · free_shipping=배송비 무료(0066).
export type CouponDiscountType = "fixed" | "percent" | "free_shipping";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  // free_shipping 에선 쓰이지 않는다(할인액 = 그 주문의 배송비).
  discount_value: number; // fixed=원, percent=%
  min_order: number;
  max_discount: number | null; // percent 상한(원)
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
};

// 할인액(원). subtotal=상품+옵션 합계(배송비 제외), shippingFee=그 주문의 배송비.
// 무료배송 쿠폰은 배송비만큼을 깎는다 — 주문 합계가 subtotal+배송비−할인 이라
// 결과적으로 배송비가 0이 된다. 그 외 유형은 subtotal 을 넘지 못한다.
export function couponDiscount(
  coupon: Coupon,
  subtotal: number,
  shippingFee = 0,
): number {
  if (subtotal < coupon.min_order) return 0;
  if (coupon.discount_type === "free_shipping")
    return Math.max(0, shippingFee);

  let d =
    coupon.discount_type === "percent"
      ? Math.floor((subtotal * coupon.discount_value) / 100)
      : coupon.discount_value;
  if (coupon.discount_type === "percent" && coupon.max_discount != null)
    d = Math.min(d, coupon.max_discount);
  return Math.max(0, Math.min(d, subtotal));
}

// 사용 가능 판정(활성·기간·총한도·최소주문). 개별 사용자 사용여부는 지갑(used_at)이 담당.
// shippingFee 를 받는 이유: 무료배송 쿠폰인데 이미 배송비가 0이면 깎을 게 없다.
// 그대로 쓰게 두면 쿠폰만 소모되고 손님은 이득이 없다 → 못 쓰게 막고 이유를 알린다.
export function couponUsable(
  coupon: Coupon,
  subtotal: number,
  shippingFee = 0,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (!coupon.is_active) return { ok: false, reason: "사용할 수 없는 쿠폰입니다." };
  if (coupon.starts_at && new Date(coupon.starts_at) > now)
    return { ok: false, reason: "아직 사용 기간이 아닙니다." };
  if (coupon.expires_at && new Date(coupon.expires_at) < now)
    return { ok: false, reason: "사용 기간이 만료된 쿠폰입니다." };
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)
    return { ok: false, reason: "쿠폰이 모두 소진되었습니다." };
  if (subtotal < coupon.min_order)
    return {
      ok: false,
      reason: `${coupon.min_order.toLocaleString("ko-KR")}원 이상 주문 시 사용할 수 있어요.`,
    };
  if (coupon.discount_type === "free_shipping" && shippingFee <= 0)
    return {
      ok: false,
      reason: `${FREE_SHIPPING_THRESHOLD.toLocaleString("ko-KR")}원 이상 주문은 배송비가 이미 무료예요.`,
    };
  return { ok: true };
}

// 할인 요약 라벨(예: "3,000원 할인", "10% 할인", "무료배송"). 목록·선택 UI 표시용.
export function couponLabel(coupon: Coupon): string {
  if (coupon.discount_type === "free_shipping") return "무료배송";
  return coupon.discount_type === "percent"
    ? `${coupon.discount_value}% 할인`
    : `${coupon.discount_value.toLocaleString("ko-KR")}원 할인`;
}

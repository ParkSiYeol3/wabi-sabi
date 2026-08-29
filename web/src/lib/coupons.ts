// 쿠폰(0059) — 할인 계산·사용 가능 판정 공용. 서버가 진실이라 checkout/actions 가
// 이 로직으로 재계산해 total_price 를 확정한다(클라이언트 값 불신). 표시용으로 클라
// 요약에서도 같은 함수를 쓸 수 있다.

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed" | "percent";
  discount_value: number; // fixed=원, percent=%
  min_order: number;
  max_discount: number | null; // percent 상한(원)
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
};

// subtotal(상품+옵션 합계, 배송비 제외) 기준 할인액(원). 할인은 subtotal 을 넘지 못한다.
export function couponDiscount(coupon: Coupon, subtotal: number): number {
  if (subtotal < coupon.min_order) return 0;
  let d =
    coupon.discount_type === "percent"
      ? Math.floor((subtotal * coupon.discount_value) / 100)
      : coupon.discount_value;
  if (coupon.discount_type === "percent" && coupon.max_discount != null)
    d = Math.min(d, coupon.max_discount);
  return Math.max(0, Math.min(d, subtotal));
}

// 사용 가능 판정(활성·기간·총한도·최소주문). 개별 사용자 사용여부는 지갑(used_at)이 담당.
export function couponUsable(
  coupon: Coupon,
  subtotal: number,
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
  return { ok: true };
}

// 할인 요약 라벨(예: "3,000원 할인", "10% 할인"). 목록·선택 UI 표시용.
export function couponLabel(coupon: Coupon): string {
  return coupon.discount_type === "percent"
    ? `${coupon.discount_value}% 할인`
    : `${coupon.discount_value.toLocaleString("ko-KR")}원 할인`;
}

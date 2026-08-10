import { won } from "@/lib/addons";

// 배송비 정책 (대표님 확정 2026-08-10) — 7만원 이상 무료, 미만 3,500원.
// 진실은 이 상수. 상품 상세·환불정책의 "배송비 안내" 문구 기본값(SHIPPING_NOTICE)도
// 이 상수에서 파생해 실제 청구액과 어긋나지 않게 한다. 금액·기준을 바꾸려면 여기만.
export const FREE_SHIPPING_THRESHOLD = 70000;
export const BASE_SHIPPING_FEE = 3500;

// subtotal = 상품가 + 애드온(선물포장·쇼핑백) 합계. 이 값이 기준선 이상이면 무료.
export function shippingFeeFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
}

// 무료배송까지 남은 금액(0 이면 이미 무료) — 체크아웃 유도 문구용.
export function amountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

// 안내 문구 기본값 — 상수에서 파생(실 청구액과 항상 일치).
export const SHIPPING_NOTICE = `${won(FREE_SHIPPING_THRESHOLD)} 이상 구매 시 무료배송, 미만은 배송비 ${won(BASE_SHIPPING_FEE)}입니다.`;

// 배송비 정책 (대표님 확정 2026-08-29) — 10만원 이상 무료, 미만 3,500원.
// 진실은 이 상수(청구액 계산). ⚠ 금액·기준을 바꾸면 아래 SHIPPING_NOTICE 문구도
// 함께 손으로 맞출 것(문구는 대표님 표기 "10만원"이라 상수에서 자동 파생 안 함).
export const FREE_SHIPPING_THRESHOLD = 100000;
export const BASE_SHIPPING_FEE = 3500;

// subtotal = 상품가 + 애드온(선물포장·쇼핑백) 합계. 이 값이 기준선 이상이면 무료.
export function shippingFeeFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
}

// 무료배송까지 남은 금액(0 이면 이미 무료) — 체크아웃 유도 문구용.
export function amountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

// 안내 문구 기본값 — 대표님 표기(2줄). whitespace-pre-line 로 렌더되어 개행 유지.
// ⚠ 위 상수(BASE_SHIPPING_FEE·FREE_SHIPPING_THRESHOLD)와 값이 일치해야 한다.
// 대표님 — 한 줄로(들여쓰기 없이). 가운뎃점으로 두 문구를 잇는다.
export const SHIPPING_NOTICE = `기본배송 3,500원 · 10만원 이상 무료배송`;

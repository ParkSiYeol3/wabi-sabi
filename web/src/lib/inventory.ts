// 재고 임계 단일 출처 (#145). 이 값 이하(품절 제외)면 재입고 경고.
// 어드민 대시보드 요약 RPC(0025) 파라미터와 상품 목록 뱃지가 같은 값을 쓴다.
export const LOW_STOCK_THRESHOLD = 5;

// 매장 비치용 예약 재고(대표님) — 이 수량은 온라인에서 판매하지 않는다. 실재고가
// 이 값 이하로 남으면 손님에게 품절 처리(매장에 최소 1개는 남겨두기 위함).
// 표시(품절 뱃지)·체크아웃 검증·결제확정 RPC(마이그 0060)가 같은 값을 쓴다.
export const STORE_RESERVE = 1;

// 온라인 판매 가능 수량 = 실재고 − 예약분(음수 방지).
export function availableStock(stock: number): number {
  return Math.max(0, stock - STORE_RESERVE);
}

// 실재고 기준 품절 여부(예약분 반영). stock ≤ STORE_RESERVE 이면 품절.
export function isStockSoldOut(stock: number): boolean {
  return availableStock(stock) <= 0;
}

// 저재고 = 판매 가능 수량이 남아 있으나 임계 이하. 품절(예약분 이하)은 별도로 다룬다.
export function isLowStock(stock: number): boolean {
  return !isStockSoldOut(stock) && stock <= LOW_STOCK_THRESHOLD;
}

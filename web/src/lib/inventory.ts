// 재고 임계 단일 출처 (#145). 이 값 이하(품절 제외)면 재입고 경고.
// 어드민 대시보드 요약 RPC(0025) 파라미터와 상품 목록 뱃지가 같은 값을 쓴다.
export const LOW_STOCK_THRESHOLD = 5;

// 저재고 = 재고가 남아 있으나 임계 이하. 0(품절)은 별도로 다룬다.
export function isLowStock(stock: number): boolean {
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
}

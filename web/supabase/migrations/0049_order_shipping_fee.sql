-- 0049: 주문 배송비 (대표님 정책 확정 — 7만원 이상 무료, 미만 3,500원)
--
-- 배송비는 상품+옵션 합계(subtotal)로 결정되며 서버(createPendingOrder)가
-- lib/shipping.ts 로 재계산해 total_price 에 합산한다. total_price 는
-- confirm_order_paid 가 저장값 그대로 검증하므로 클라이언트 변조는 무해하다.
-- 이 컬럼은 표시·기록용 스냅샷(주문 시점 배송비) — 이후 정책이 바뀌어도
-- 과거 주문의 배송비는 불변. total_price 에는 이미 포함돼 있다(중복 아님).
alter table public.orders
  add column if not exists shipping_fee int not null default 0
  check (shipping_fee >= 0);

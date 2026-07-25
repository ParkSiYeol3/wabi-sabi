-- 0033: 주문 추가 옵션(애드온) — 선물 포장·쇼핑백 등 (#250, 대표님 시안)
--
-- 전역 공통 애드온을 주문 단위로 선택한다(상품별 variant/재고 아님 — 재고 무관 서비스).
-- gift_options 는 order_id UNIQUE(주문당 1행)라 여러 애드온을 담을 수 없어,
-- 선택 애드온 목록을 orders 에 jsonb 스냅샷으로 저장한다.
--   [{ "code": "gift_wrap", "name": "선물 포장", "price": 4000 }, ...]
-- 가격·이름은 주문 시점 스냅샷 — 이후 애드온 정가가 바뀌어도 과거 주문은 불변.
-- 서버(createPendingOrder)가 코드로 정가를 재계산해 total_price 에 합산하고,
-- confirm_order_paid 가 total_price 를 검증하므로 클라이언트 변조는 무해하다.

alter table public.orders
  add column if not exists selected_addons jsonb not null default '[]'::jsonb;

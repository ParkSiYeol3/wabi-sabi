-- 0034: 애드온을 라인(상품) 단위로 (#253, 대표님 시안 — 상세에서 옵션 선택 후 담기)
--
-- #250 은 애드온을 주문 단위(orders.selected_addons)로 뒀으나, 시안대로 상품
-- 상세에서 선택·담게 하려면 장바구니 라인마다 옵션이 붙어야 한다.
-- 방식: 라인당 옵션 1세트(같은 상품은 한 라인, 옵션은 그 라인에). cart_items
-- UNIQUE(user, product) 를 그대로 두고 addons jsonb 만 얹는다.
--   cart_items.addons  = ["gift_wrap", ...]              (선택 코드)
--   order_items.addons = [{code,name,price}, ...]        (주문 시점 스냅샷)
-- orders.selected_addons(#250)는 하위호환으로 남기되 새 주문은 쓰지 않는다.
-- 애드온 정가는 서버(addons.ts)로만 재계산 — confirm_order_paid 가 total 검증.

alter table public.cart_items
  add column if not exists addons jsonb not null default '[]'::jsonb;

alter table public.order_items
  add column if not exists addons jsonb not null default '[]'::jsonb;

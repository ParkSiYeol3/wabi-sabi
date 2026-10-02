-- 주문별 택배사 (#756, 2026-10-03). 그동안 코드에 우체국택배 하나로 고정돼 있어서(#748)
-- 다른 택배사로 보내면 배송 메일·조회 링크가 전부 우체국으로 갔다.
-- 값은 앱의 COURIERS 코드(lib/orders.ts). null = 0072 이전 주문 또는 송장 없음 → 앱에서 우체국으로 본다.
-- 택배사를 늘릴 땐 이 제약과 COURIERS 를 함께 고친다.
alter table public.orders add column if not exists courier text;

alter table public.orders drop constraint if exists orders_courier_check;
alter table public.orders add constraint orders_courier_check
  check (courier is null or courier in ('epost', 'cj', 'hanjin', 'lotte', 'logen', 'etc'));

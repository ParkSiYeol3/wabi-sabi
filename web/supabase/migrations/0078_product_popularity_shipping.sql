-- 주문 많은 순 집계에 배송 중 주문 포함(#826).
-- 0047 은 유효 주문을 ('paid', 'delivered') 로만 세서, 발송 뒤 shipping 인 동안 그 판매가
-- 순위에서 빠졌다가 배송완료 뒤에 돌아왔다. 다른 집계(0021·0025·0031·0052·0055·0063)와
-- 같은 ('paid', 'shipping', 'delivered') 로 맞춘다. 컬럼·권한·정의자 권한은 0047 그대로
-- (create or replace view 는 기존 grant 를 유지한다).
create or replace view public.product_popularity as
select
  p.id as product_id,
  coalesce(o.cnt, 0)::int as order_count,
  coalesce(w.cnt, 0)::int as like_count
from public.products p
left join (
  -- 유효 주문(결제완료·배송 중·배송완료)만 집계. 취소·결제 전 주문은 제외.
  select oi.product_id, sum(oi.quantity) as cnt
  from public.order_items oi
  join public.orders ord on ord.id = oi.order_id
  where ord.status in ('paid', 'shipping', 'delivered')
  group by oi.product_id
) o on o.product_id = p.id
left join (
  select product_id, count(*) as cnt
  from public.wishlist
  group by product_id
) w on w.product_id = p.id;

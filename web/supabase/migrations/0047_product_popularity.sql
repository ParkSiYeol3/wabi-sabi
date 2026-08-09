-- 상품 인기 집계 뷰(#) — shop 정렬 "주문 많은 순"·"좋아요순"용.
-- order_items·wishlist 는 RLS 로 소유자만 읽지만, 여기서 노출하는 건 상품별 "합계
-- 숫자"뿐(개별 사용자·주문 정보 없음)이라 공개해도 안전하다. 공개 shop 로더는 anon
-- 클라이언트로 조회하므로, 집계가 RLS 에 막히지 않도록 일반 뷰(정의자 권한)로 둔다.
create or replace view public.product_popularity as
select
  p.id as product_id,
  coalesce(o.cnt, 0)::int as order_count,
  coalesce(w.cnt, 0)::int as like_count
from public.products p
left join (
  -- 유효 주문(결제완료·배송완료)만 집계. 취소 주문은 제외.
  select oi.product_id, sum(oi.quantity) as cnt
  from public.order_items oi
  join public.orders ord on ord.id = oi.order_id
  where ord.status in ('paid', 'delivered')
  group by oi.product_id
) o on o.product_id = p.id
left join (
  select product_id, count(*) as cnt
  from public.wishlist
  group by product_id
) w on w.product_id = p.id;

-- 공개 읽기(집계 숫자만). 정의자 권한 뷰라 anon 도 실제 합계를 받는다.
grant select on public.product_popularity to anon, authenticated;

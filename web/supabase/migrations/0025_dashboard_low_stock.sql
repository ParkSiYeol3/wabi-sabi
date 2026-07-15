-- 0025: 대시보드 요약에 저재고 카운트 추가 (#145)
--
-- 0024 는 품절(stock=0)만 셌다. 재고가 소진 임박(임계 이하)인 상품도 미리 알아야
-- 재입고·발주 타이밍을 놓치지 않는다. 임계값은 애플리케이션(lib/inventory)이 단일
-- 출처이므로 파라미터로 받는다(기본 5). 파라미터가 붙어 시그니처가 바뀌므로 기존
-- 무인자 함수를 drop 후 재정의한다.

drop function if exists public.admin_dashboard_summary();

create or replace function public.admin_dashboard_summary(low_stock_threshold int default 5)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with kst_today as (
    select (date_trunc('day', now() at time zone 'Asia/Seoul')
              at time zone 'Asia/Seoul') as start_utc
  )
  select json_build_object(
    'awaiting_ship',
      (select count(*) from orders where status = 'paid'),
    'shipping',
      (select count(*) from orders where status = 'shipping'),
    'unanswered',
      (select count(*) from inquiries where answer is null),
    'out_of_stock',
      (select count(*) from products where is_active and stock = 0),
    'low_stock',
      (select count(*) from products
        where is_active and stock > 0 and stock <= low_stock_threshold),
    'reported_reviews',
      (select count(distinct rr.review_id)
         from review_reports rr
         join reviews r on r.id = rr.review_id
        where r.hidden = false),
    'today_orders',
      (select count(*) from orders, kst_today
        where ordered_at >= kst_today.start_utc
          and status in ('paid', 'shipping', 'delivered')),
    'today_revenue',
      (select coalesce(sum(total_price), 0) from orders, kst_today
        where ordered_at >= kst_today.start_utc
          and status in ('paid', 'shipping', 'delivered'))
  );
$$;

-- security definer 라 RLS 우회 → 어드민(service_role) 로만 실행 제한.
revoke execute on function public.admin_dashboard_summary(int) from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary(int) to service_role;

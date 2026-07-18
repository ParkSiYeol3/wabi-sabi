-- 0031: 어드민 대시보드 일별 매출 추이 RPC (#191)
--
-- 최근 N일(KST 하루 경계)의 주문 건수·매출을 일자별로 돌려준다. 집계를 DB 로 내리는
-- 이유는 0024 와 동일 — Data API 1,000행 제한에서 JS 집계는 조용히 낮게 나온다.
-- 하루 경계는 KST: ordered_at 을 'Asia/Seoul' 로 변환해 날짜로 자른다(0024 관례).
-- 주문이 없는 날도 0 으로 채워 연속된 축을 보장한다(generate_series left join).

create or replace function public.admin_sales_trend(p_days int default 7)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with days as (
    select generate_series(
      (date_trunc('day', now() at time zone 'Asia/Seoul'))::date - (p_days - 1),
      (date_trunc('day', now() at time zone 'Asia/Seoul'))::date,
      interval '1 day'
    )::date as d
  ),
  daily as (
    select (ordered_at at time zone 'Asia/Seoul')::date as d,
           count(*)::int as orders,
           coalesce(sum(total_price), 0)::bigint as revenue
      from orders
     where status in ('paid', 'shipping', 'delivered')
       -- 범위 하한(가장 이른 KST 자정)을 UTC 로 되돌려 인덱스 대상 컬럼과 비교
       and ordered_at >=
         ((date_trunc('day', now() at time zone 'Asia/Seoul'))::date - (p_days - 1))::timestamp
           at time zone 'Asia/Seoul'
     group by 1
  )
  select coalesce(
    json_agg(
      json_build_object(
        'day', to_char(days.d, 'YYYY-MM-DD'),
        'orders', coalesce(daily.orders, 0),
        'revenue', coalesce(daily.revenue, 0)
      )
      order by days.d
    ),
    '[]'::json
  )
  from days
  left join daily on daily.d = days.d;
$$;

-- security definer 라 RLS 우회 — 매출은 어드민 경로(service_role)로만.
revoke execute on function public.admin_sales_trend(int) from public, anon, authenticated;
grant execute on function public.admin_sales_trend(int) to service_role;

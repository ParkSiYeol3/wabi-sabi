-- 0052: 어드민 매출·통계·정산 RPC (대표님 — 매출 관리/통계/정산 내역)
--
-- 집계를 DB 로 내리는 이유는 0024·0031 과 동일 — Data API 1,000행 제한에서 JS 집계는
-- 조용히 낮게 나온다. 매출은 "확정 주문"만: status in (paid, shipping, delivered)
-- (미결제·취소 제외). 금액은 orders.total_price(상품+애드온+배송비 결제액) 기준.
-- 하루/주/월/연 경계는 KST(Asia/Seoul, 0024·0031 관례).

-- ── 기간별 매출·건수 (정산 내역 표 + 매출 추이) ──────────────────────
-- p_bucket: 'day'|'week'|'month'|'year'. p_count: 돌려줄 최근 버킷 개수.
-- 주문이 없는 버킷도 0 으로 채워 연속 축 보장(generate_series left join).
create or replace function public.admin_sales_by_period(
  p_bucket text default 'month',
  p_count int default 12
)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with params as (
    select case p_bucket
             when 'day'  then interval '1 day'
             when 'week' then interval '1 week'
             when 'year' then interval '1 year'
             else interval '1 month'
           end as step,
           case p_bucket
             when 'day' then 'day' when 'week' then 'week'
             when 'year' then 'year' else 'month'
           end as trunc,
           case p_bucket
             when 'day'  then 'YYYY-MM-DD'
             when 'week' then 'YYYY-MM-DD'
             when 'year' then 'YYYY'
             else 'YYYY-MM'
           end as fmt
  ),
  anchor as (
    select date_trunc((select trunc from params),
                      now() at time zone 'Asia/Seoul') as cur
  ),
  buckets as (
    select generate_series(
      (select cur from anchor) - (p_count - 1) * (select step from params),
      (select cur from anchor),
      (select step from params)
    ) as b
  ),
  agg as (
    select date_trunc((select trunc from params),
                      ordered_at at time zone 'Asia/Seoul') as b,
           count(*)::int as orders,
           coalesce(sum(total_price), 0)::bigint as revenue
      from orders
     where status in ('paid', 'shipping', 'delivered')
       and (ordered_at at time zone 'Asia/Seoul') >=
           ((select cur from anchor) - (p_count - 1) * (select step from params))
     group by 1
  )
  select coalesce(
    json_agg(
      json_build_object(
        'label', to_char(buckets.b, (select fmt from params)),
        'orders', coalesce(agg.orders, 0),
        'revenue', coalesce(agg.revenue, 0)
      ) order by buckets.b
    ),
    '[]'::json
  )
  from buckets
  left join agg on agg.b = buckets.b;
$$;

-- ── 베스트셀러 (통계 — 어떤 상품이 많이 팔리는가) ─────────────────────
-- 최근 p_days 일 확정 주문의 order_items 를 상품별로 합산, 판매수량 상위 p_limit.
create or replace function public.admin_best_sellers(
  p_days int default 30,
  p_limit int default 10
)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'product_id', t.product_id,
      'name', t.name,
      'qty', t.qty,
      'revenue', t.revenue
    ) order by t.qty desc
  ), '[]'::json)
  from (
    select oi.product_id,
           max(oi.product_name) as name,
           sum(oi.quantity)::bigint as qty,
           sum(oi.price * oi.quantity)::bigint as revenue
      from order_items oi
      join orders o on o.id = oi.order_id
     where o.status in ('paid', 'shipping', 'delivered')
       and o.ordered_at >= (now() - make_interval(days => p_days))
     group by oi.product_id
     order by qty desc
     limit p_limit
  ) t;
$$;

-- security definer 라 RLS 우회 — 매출·통계는 어드민 경로(service_role)로만.
revoke execute on function public.admin_sales_by_period(text, int) from public, anon, authenticated;
grant  execute on function public.admin_sales_by_period(text, int) to service_role;
revoke execute on function public.admin_best_sellers(int, int) from public, anon, authenticated;
grant  execute on function public.admin_best_sellers(int, int) to service_role;

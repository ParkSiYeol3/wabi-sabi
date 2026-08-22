-- 0053: 어드민 매출 상태별 요약 RPC (대표님 — 결제완료 / 배송중·완료 / 미결제·취소환불
-- 3섹션으로 직관화). 상태별 주문 건수·금액을 한 번에 집계한다(Data API 1,000행 제한
-- 회피, 0024·0031·0052 관례). 금액은 total_price(결제액) 기준.
--
-- 스키마 상태: pending(미결제)·paid(결제완료)·shipping(배송중)·delivered(배송완료)·
-- cancelled(취소=환불처리 포함). refunded 별도 상태 없음 → 취소가 환불을 포함한다.
create or replace function public.admin_order_status_summary()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'status', t.status,
      'orders', t.orders,
      'revenue', t.revenue
    )
  ), '[]'::json)
  from (
    select status,
           count(*)::int as orders,
           coalesce(sum(total_price), 0)::bigint as revenue
      from orders
     group by status
  ) t;
$$;

revoke execute on function public.admin_order_status_summary() from public, anon, authenticated;
grant  execute on function public.admin_order_status_summary() to service_role;

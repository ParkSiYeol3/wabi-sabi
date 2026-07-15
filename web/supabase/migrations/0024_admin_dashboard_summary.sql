-- 0024: 어드민 대시보드 요약 집계 RPC (#143, #144 리뷰 반영)
--
-- 처음엔 원시 행을 가져와 JS 에서 Set/reduce 로 집계했는데, Supabase Data API 기본
-- 1,000행 제한을 넘으면 신고 수·주문 수·매출이 조용히 낮게 표시된다(특히 매출은 돈이라
-- 하루 주문이 많아지는 시점에 틀린 수치가 대표님께 노출된다). 집계를 DB 로 내린다.
-- 단일 호출이라 애플리케이션에서 .throwOnError() 한 번으로 실패를 에러 경계로 보낸다.
--
-- 하루 경계는 KST 로 고정 — 서버(UTC)에서 "오늘"을 세면 00~09시(KST) 주문이 전날로 샌다.
-- date_trunc(..., now() at time zone 'Asia/Seoul') 로 KST 로컬 자정을 구한 뒤 다시
-- at time zone 'Asia/Seoul' 로 UTC timestamptz 로 되돌려 ordered_at 과 비교한다.

create or replace function public.admin_dashboard_summary()
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

-- security definer 라 RLS 를 우회한다. 일반 사용자가 부르면 전체 매출·미답변 문의 수가
-- 새므로 실행 권한을 어드민 경로(service_role)로만 제한한다.
revoke execute on function public.admin_dashboard_summary() from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary() to service_role;

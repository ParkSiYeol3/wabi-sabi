-- 방문자 집계(대표님 — admin 대시보드에 매출과 함께 방문자 수 표시). Vercel Web
-- Analytics 는 Vercel 대시보드에서만 보이고 우리 화면으로 못 끌어오므로, 가벼운
-- 자체 1st-party 카운터를 둔다. /api/track 이 service_role 로 한 행씩 적재하고,
-- admin_visit_summary() 가 KST 일자 기준으로 오늘/최근7일/최근30일을 집계한다.
--
-- visitor_id = 브라우저 localStorage 의 opaque 난수(개인식별 아님). path 는 방문 경로.
-- day 는 적재 시점의 KST 날짜(집계 경계를 KST 로 고정).

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  path text,
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now()
);

create index if not exists page_views_day_idx on public.page_views (day);
create index if not exists page_views_day_visitor_idx
  on public.page_views (day, visitor_id);

-- 정책 없음 → 일반/익명/로그인 사용자는 읽기·쓰기 불가. service_role(RLS 우회)만
-- 접근한다. 적재는 서버 라우트(/api/track), 조회는 admin_visit_summary().
alter table public.page_views enable row level security;

-- 방문 요약(KST 일자 기준) — 오늘·최근7일·최근30일의 페이지뷰(행 수)와
-- 순방문자(visitor_id distinct). security definer 로 RLS 를 우회하되, 30일 밖은
-- where 로 잘라 스캔을 제한한다.
create or replace function public.admin_visit_summary()
returns table (
  today_views bigint,
  today_visitors bigint,
  d7_views bigint,
  d7_visitors bigint,
  d30_views bigint,
  d30_visitors bigint
)
language sql
security definer
set search_path = public
as $$
  with t as (select (now() at time zone 'Asia/Seoul')::date as d)
  select
    count(*) filter (where pv.day = (select d from t)),
    count(distinct pv.visitor_id) filter (where pv.day = (select d from t)),
    count(*) filter (where pv.day >= (select d from t) - 6),
    count(distinct pv.visitor_id) filter (where pv.day >= (select d from t) - 6),
    count(*),
    count(distinct pv.visitor_id)
  from public.page_views pv
  where pv.day >= (select d from t) - 29;
$$;

revoke all on function public.admin_visit_summary() from public, anon, authenticated;
grant execute on function public.admin_visit_summary() to service_role;

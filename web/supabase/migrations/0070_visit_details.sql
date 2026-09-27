-- 0070: 방문 기록 판별 정보 (시열님 2026-09-27 — "우리 사이트를 찾아온 손님이 있는지").
--
-- 9/27 새벽 3시에 35분 동안 131명이 한 페이지씩만 보고 나간 기록이 있었다. 사람인지
-- 자동 수집 프로그램인지 가릴 정보가 없어 대표님께 "봇 추정"이라고밖에 못 했다.
-- 방문 한 줄에 **개인을 알아볼 수 없는** 판별 정보를 더한다. IP 는 저장하지 않는다
-- (시열님 결정 — 지역은 IP 로 추정한 시 단위만 남긴다).
--
--   device/browser/os  User-Agent 를 서버가 짧은 이름으로 줄인 것(원문 저장 안 함)
--   lang/tz            브라우저 언어·시간대(ko-KR / Asia/Seoul 이면 국내 손님일 가능성)
--   country/region/city  IP 로 추정한 대략적 지역(Vercel 헤더)
--   automated          navigator.webdriver — 자동화 프로그램이 스스로 켜 두는 표시
--   engaged            그 방문자가 클릭·터치·키 입력을 했는지(하루 단위로 올린다)

alter table public.page_views
  add column if not exists device text,
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists lang text,
  add column if not exists tz text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists automated boolean,
  add column if not exists engaged boolean not null default false;

-- 오늘 방문자 판별 — 방문자 단위로 묶어 셋으로 나눈다.
--   봇 의심   자동화 표시가 한 번이라도 있음
--   사람 확인 자동화 표시 없고 클릭·터치·키 입력을 함
--   미확인    둘 다 아님(한 페이지만 보고 나갔거나, 0070 이전 기록)
create or replace function public.admin_visit_people()
returns table (humans bigint, unknown bigint, bots bigint)
language sql
security definer
set search_path = public
stable
as $$
  with v as (
    select visitor_id,
           bool_or(coalesce(automated, false)) as a,
           bool_or(engaged) as e
      from public.page_views
     where day = (now() at time zone 'Asia/Seoul')::date
     group by visitor_id
  )
  select count(*) filter (where not a and e),
         count(*) filter (where not a and not e),
         count(*) filter (where a)
    from v;
$$;

-- 최근 방문자(오늘·어제) — 방문자 하나에 한 줄. 대시보드에서 "누가 왔는지" 훑는 용도.
-- visitor 는 일일 해시의 앞 6자리만(같은 줄 묶음 표시용, 되돌릴 수 없음).
create or replace function public.admin_recent_visitors(p_limit int default 30)
returns table (
  visitor text,
  day date,
  first_at timestamptz,
  last_at timestamptz,
  views bigint,
  source text,
  device text,
  browser text,
  os text,
  country text,
  region text,
  city text,
  lang text,
  tz text,
  automated boolean,
  engaged boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select left(pv.visitor_id, 6),
         pv.day,
         min(pv.created_at),
         max(pv.created_at),
         count(*),
         (array_agg(pv.source order by pv.created_at)
            filter (where pv.source is not null))[1],
         max(pv.device),
         max(pv.browser),
         max(pv.os),
         max(pv.country),
         max(pv.region),
         max(pv.city),
         max(pv.lang),
         max(pv.tz),
         bool_or(coalesce(pv.automated, false)),
         bool_or(pv.engaged)
    from public.page_views pv
   where pv.day >= (now() at time zone 'Asia/Seoul')::date - 1
   group by pv.visitor_id, pv.day
   order by max(pv.created_at) desc
   limit greatest(least(p_limit, 100), 1);
$$;

revoke execute on function public.admin_visit_people() from public, anon, authenticated;
grant  execute on function public.admin_visit_people() to service_role;
revoke execute on function public.admin_recent_visitors(int) from public, anon, authenticated;
grant  execute on function public.admin_recent_visitors(int) to service_role;

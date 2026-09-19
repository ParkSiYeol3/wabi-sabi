-- 유입 경로(0054 방문 카운터 확장) — 오픈 1주차 점검에서 "손님이 어디서 오는지"를
-- 아무도 모른다는 게 드러났다. 방문자 수·퍼널은 있는데 네이버 검색인지, 인스타
-- 링크인지, 직접 주소를 친 것인지 구분할 근거가 없어 다음에 뭘 해야 할지 못 정한다.
--
-- source 는 서버가 정규화한 짧은 라벨만 담는다(naver · instagram · direct 등).
-- 원본 referrer URL·검색어·쿼리스트링은 저장하지 않는다 — 방문자 식별에 쓰일 수 있고
-- 집계에 필요하지도 않다. 사이트 안에서의 이동(내부 referrer)은 유입이 아니므로 null.
alter table public.page_views
  add column if not exists source text;

-- 집계는 "최근 N일 × source" 라 그 순서로 인덱스. 유입 행만 대상이라 부분 인덱스.
create index if not exists page_views_day_source_idx
  on public.page_views (day, source)
  where source is not null;

-- 유입 경로 요약(KST 일자 기준). 0054 의 다른 요약 함수와 같은 규칙 —
-- security definer 로 RLS 를 우회하되 기간을 where 로 잘라 스캔을 제한하고,
-- 실행 권한은 service_role 만(어드민 화면은 서버에서 service_role 로 부른다).
create or replace function public.admin_visit_sources(p_days int default 7)
returns table (
  source text,
  visitors bigint,
  views bigint
)
language sql
security definer
set search_path = public
as $$
  select
    pv.source,
    count(distinct pv.visitor_id),
    count(*)
  from public.page_views pv
  where pv.source is not null
    and pv.day >= (now() at time zone 'Asia/Seoul')::date
                  - (greatest(coalesce(p_days, 7), 1) - 1)
  group by pv.source
  order by count(distinct pv.visitor_id) desc, count(*) desc;
$$;

revoke all on function public.admin_visit_sources(int) from public, anon, authenticated;
grant execute on function public.admin_visit_sources(int) to service_role;

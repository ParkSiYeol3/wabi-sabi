-- 0056: 방문자 집계 정확화 + 일별 추이(대표님).
--
-- ⚠ 일회성 리셋: 이 마이그 이전의 page_views 는 프로덕션 도메인 가드가 없던 시절
-- 프리뷰 배포(*.vercel.app)·개발 로드·봇이 프리뷰 로드마다 새 visitor_id 로 섞여
-- 방문자 수가 말이 안 되게 부풀려졌다(하루 543명 등). 실제 고객 데이터가 아니므로
-- 여기서 비운다. 이후로는 wasa.kr 방문만 클라·서버 이중 가드로 집계된다.
truncate table public.page_views;

-- admin_visit_trend 가 최근 N일의 날짜별 페이지뷰·순방문자를 채워 준다. 방문이 0인
-- 날도 빈 칸으로 채워 그래프가 끊기지 않게(generate_series 로 날짜 축 생성). KST 기준.
create or replace function public.admin_visit_trend(p_days int default 14)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with days as (
    select generate_series(
      (now() at time zone 'Asia/Seoul')::date - (greatest(p_days, 1) - 1),
      (now() at time zone 'Asia/Seoul')::date,
      interval '1 day'
    )::date as d
  ),
  agg as (
    select pv.day,
           count(*)::int as views,
           count(distinct pv.visitor_id)::int as visitors
      from page_views pv
     where pv.day >= (now() at time zone 'Asia/Seoul')::date - (greatest(p_days, 1) - 1)
     group by pv.day
  )
  select coalesce(json_agg(
    json_build_object(
      'day', to_char(days.d, 'YYYY-MM-DD'),
      'views', coalesce(agg.views, 0),
      'visitors', coalesce(agg.visitors, 0)
    ) order by days.d
  ), '[]'::json)
  from days
  left join agg on agg.day = days.d;
$$;

revoke execute on function public.admin_visit_trend(int) from public, anon, authenticated;
grant  execute on function public.admin_visit_trend(int) to service_role;

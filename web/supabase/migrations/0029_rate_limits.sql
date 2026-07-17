-- 0029: Supabase 기반 rate limit 저장소 (#187)
--
-- 기존 lib/rate-limit.ts 는 Upstash Redis(미설정) → 인메모리 폴백 2단이었다. 인메모리는
-- 서버리스 인스턴스마다 독립(Map)이라 Vercel 에서 상한이 인스턴스 수만큼 느슨해지고
-- 콜드스타트마다 리셋된다. 외부 인프라(Redis) 없이 인스턴스 간 공유되는 상한이 필요해
-- 카운터를 이 테이블에 둔다. check_rate_limit RPC 가 원자적으로 증가·조회한다.
--
-- 고정 창(fixed window): window_start = floor(epoch / window_seconds) * window_seconds.
-- 같은 (bucket, window_start) 로 upsert 증가하고 증가 후 카운트를 반환한다.

create table if not exists public.rate_limits (
  bucket text not null,
  window_start bigint not null, -- epoch 초를 창 크기로 내림한 값
  count int not null default 0,
  primary key (bucket, window_start)
);

-- 카운터 테이블은 애플리케이션(service_role)만 만진다. RLS 켜고 정책을 두지 않으면
-- anon·authenticated 는 직접 접근이 전부 막히고, service_role 은 RLS 를 우회한다.
alter table public.rate_limits enable row level security;

-- 원자적 증가 + 반환. security definer 로 RLS 를 우회하되 실행 권한은 service_role 로만
-- 제한한다(무인증/일반 사용자가 직접 호출해 카운터를 조작하지 못하게).
create or replace function public.check_rate_limit(
  p_bucket text,
  p_limit int,
  p_window_seconds int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start bigint;
  v_count int;
begin
  v_window_start :=
    floor(extract(epoch from now()) / p_window_seconds)::bigint * p_window_seconds;

  insert into public.rate_limits (bucket, window_start, count)
    values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- 낮은 확률로 오래된 창을 청소한다(전용 잡 없이 무한 증식 방지). 창 크기와 무관하게
  -- 1시간보다 오래된 행은 어떤 상한에도 더는 필요 없다.
  if random() < 0.005 then
    delete from public.rate_limits
     where window_start < extract(epoch from now())::bigint - 3600;
  end if;

  return v_count; -- 증가 후 현재 창의 요청 수(호출부가 limit 과 비교)
end;
$$;

revoke execute on function public.check_rate_limit(text, int, int)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int)
  to service_role;

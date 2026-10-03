-- 0073: 인스타그램 장기 토큰 보관 (#775)
-- 홈 인스타 피드 토큰은 60일 만료라 크론(/api/cron/refresh-instagram)이 주기적으로
-- 갱신한다. 환경변수(INSTAGRAM_ACCESS_TOKEN)는 런타임에 바꿀 수 없어 새 토큰을 여기 둔다.
-- 환경변수는 첫 갱신의 씨앗이자, 이 행이 없거나 만료됐을 때의 폴백으로만 쓴다.
--
-- 시크릿이므로 RLS 활성 + 정책 없음 → service_role 만 접근(anon·authenticated 0).
-- 한 행만 둔다(id = true 고정).

create table if not exists public.instagram_token (
  id boolean primary key default true check (id),
  access_token text not null,
  expires_at timestamptz,          -- 갱신 응답의 expires_in 으로 계산. 모르면 null
  refreshed_at timestamptz,        -- 마지막 갱신 성공 시각
  last_error text,                 -- 마지막 실패 사유(토큰 값은 넣지 않는다)
  last_error_at timestamptz
);

alter table public.instagram_token enable row level security;
-- 정책 없음. 기본 grant 도 회수해 둔다(이중 차단).
revoke all on public.instagram_token from anon, authenticated;

-- 0014: 클라이언트 에러 로그 (보안_체크리스트 P2 모니터링)
-- error.tsx 는 client component — console.error 가 브라우저 콘솔에만 남아
-- 운영자가 볼 수 없다. 서버로 보내 기록해야 프로덕션 에러 가시성이 생긴다.
-- Sentry 는 외부 계정 필요(👤) — 우선 DB 자체 수집(감사로그 0013 과 동일 패턴).
-- 쓰기·읽기 service_role 전용(RLS 활성 + 정책 없음).

create table public.client_error_log (
  id uuid primary key default gen_random_uuid(),
  digest text,                   -- Next 서버 에러 digest(Vercel 로그와 상관)
  message text,
  url text,                      -- 발생 경로
  user_agent text,
  user_id uuid references auth.users (id) on delete set null,  -- 서버 세션 기준
  created_at timestamptz not null default now()
);

create index client_error_log_created_idx on public.client_error_log (created_at desc);

alter table public.client_error_log enable row level security;
-- 정책 없음 → service_role 만 접근.

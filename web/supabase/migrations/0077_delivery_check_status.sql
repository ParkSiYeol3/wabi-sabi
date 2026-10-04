-- 0077: 우체국 배송조회 크론의 마지막 실행 결과 (#794)
-- /api/cron/check-deliveries(#791)는 키가 없으면 로그 없이 건너뛰고, 정상 실행도 아무것도
-- 남기지 않아 "키 없음"과 "배송 중이라 할 일 없음"이 구분되지 않았다. 매 실행 끝에 이 행을
-- 갱신해 로그 없이도 DB 로 동작을 확인한다.
--
-- 운영 상태라 RLS 활성 + 정책 없음 → service_role 만 접근(0073 과 같은 패턴).
-- 한 행만 둔다(id = true 고정).

create table if not exists public.delivery_check_status (
  id boolean primary key default true check (id),
  ran_at timestamptz not null,
  checked integer not null default 0,     -- 조회한 주문 수
  delivered integer not null default 0,   -- 이번 실행에서 배송완료로 바꾼 수
  error_count integer not null default 0, -- 조회 실패 수
  last_error text,                        -- 이번 실행의 오류 문구(송장·키는 넣지 않는다)
  skipped text                            -- 건너뛴 사유(예: no epost key)
);

alter table public.delivery_check_status enable row level security;
-- 정책 없음. 기본 grant 도 회수해 둔다(이중 차단).
revoke all on public.delivery_check_status from anon, authenticated;

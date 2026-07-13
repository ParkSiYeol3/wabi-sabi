-- 0017: 뉴스레터 구독자 (#108)
-- 홈 Newsletter 폼이 action 없는 껍데기라 이메일을 넣고 "구독하기"를 눌러도
-- 아무 일도 일어나지 않았다(사용자 기만). 실제로 수집·저장한다.
--
-- 이메일은 개인정보다. 수집 근거를 남기기 위해 동의 시각(consented_at)을 함께
-- 저장하고, 개인정보처리방침(#106) 동의 체크 없이는 서버 액션이 거절한다.
-- 읽기·쓰기 모두 service_role 전용(RLS 활성 + 정책 없음) — 구독자 목록은
-- 이메일 주소 집합이라 유출 시 피해가 크다. 공개 클라이언트에 절대 노출 금지.
-- 사용자 입력은 서버 액션이 service_role 로 대신 기록한다(0012·0014 와 동일).

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  -- 로그인 상태로 구독했다면 연결(비로그인 구독도 허용 — 방문자 대상 마케팅)
  user_id uuid references auth.users (id) on delete set null,
  consented_at timestamptz not null default now(),  -- 개인정보 수집·이용 동의 시각
  unsubscribed_at timestamptz,                      -- 구독 취소(행 삭제 대신 표시)
  created_at timestamptz not null default now()
);

create index newsletter_subscribers_created_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers enable row level security;
-- 정책 없음 → service_role 만 접근.

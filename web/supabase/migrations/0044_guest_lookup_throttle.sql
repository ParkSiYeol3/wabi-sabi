-- 비회원 주문조회 브루트포스 방지 스로틀 (94단계 후속, #362 게스트 체크아웃)
-- 게스트 주문조회는 주문번호+전화번호 2요소로 조회한다. 주문번호(시간기반)는 다소
-- 추측 가능하므로, 전화번호 기준으로 최근 시도 횟수를 세어 과도한 조회(브루트포스)를
-- 차단한다. 로그성 테이블 — service_role 만 읽고 쓴다(공개 정책 없음 = 전면 차단).
-- 오래된 행은 cleanup-pending 크론이 함께 정리한다(무한 증가 방지).
create table if not exists public.guest_lookup_throttle (
  id bigint generated always as identity primary key,
  throttle_key text not null, -- 정규화한 전화번호
  attempted_at timestamptz not null default now()
);

create index if not exists idx_guest_lookup_throttle_key_at
  on public.guest_lookup_throttle (throttle_key, attempted_at desc);

alter table public.guest_lookup_throttle enable row level security;
-- 정책을 만들지 않는다 → 익명·로그인 사용자 모두 접근 불가. service_role(서버)만 우회.

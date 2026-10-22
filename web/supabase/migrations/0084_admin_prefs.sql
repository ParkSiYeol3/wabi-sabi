-- 0084 관리자 대시보드 바로가기를 계정마다 고른다(시열님 2026-10-22, "북마크 같은 느낌").
--
-- 관리자 한 명에 한 줄. shortcuts 는 관리자 메뉴 경로(/admin/...)를 고른 순서대로.
-- 줄이 없으면 화면은 기본 바로가기를 쓴다. 휴대폰·컴퓨터에서 같은 바로가기가 보이게
-- 브라우저가 아니라 DB 에 둔다.
-- 읽기·쓰기는 서버가 관리자 확인 뒤 service_role 로만 → anon·authenticated 직접 접근 차단.
-- 고를 수 있는 메뉴 목록은 서버가 사이드바 메뉴(nav.ts)로 거른다. 여기선 모양·개수만 막는다.

create table if not exists public.admin_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  shortcuts text[] not null default '{}'
    check (cardinality(shortcuts) <= 8)
    check (array_to_string(shortcuts, ' ') ~ '^(/admin/[a-z-]+( |$))*$'),
  updated_at timestamptz not null default now()
);

alter table public.admin_prefs enable row level security;
revoke all on public.admin_prefs from anon, authenticated;

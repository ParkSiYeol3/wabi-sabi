-- 0008: 회원 역할(role) — 어드민/일반 분리
-- 대표님이 직접 상품·게시판 관리하도록 어드민 권한을 DB role 로 관리(재배포 불필요).
-- 기본 'user'. 어드민 승격은 이 컬럼을 'admin' 으로 변경(service_role 만).

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- ⚠ 권한 상승 차단: profiles 엔 "own profile update" RLS 정책이 있어
-- 일반 사용자가 자기 role 을 'admin' 으로 self-update 할 수 있다.
-- → 테이블 UPDATE 권한을 회수하고, 사용자가 바꿔도 되는 컬럼(name)만 재부여한다.
-- role/email 등은 authenticated/anon 이 수정 불가. service_role(어드민)만 role 변경.
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

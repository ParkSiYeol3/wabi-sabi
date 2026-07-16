-- 0026: 편집 가능한 사이트 콘텐츠 (#160, 대표님 직접 수정)
--
-- 철학 소개 문구 등 대표님이 직접 고치고 싶은 텍스트를 코드가 아니라 DB 에 둔다.
-- key-value 단순 구조. 값이 없으면 애플리케이션이 기본 문구로 폴백한다.

create table public.site_content (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- 읽기: 누구나(홈·About 에서 렌더). 쓰기: service_role 어드민만(정책 없음 → 우회만 허용).
create policy "site_content public read"
  on public.site_content for select
  using (true);

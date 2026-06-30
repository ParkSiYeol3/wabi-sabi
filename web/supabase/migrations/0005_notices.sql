-- 0005: 공지사항 게시판 (형님 피드백 — 공지 카테고리)
-- 단순 목록+상세. 관리자 작성(service_role), 누구나 읽기.

create table public.notices (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.notices (created_at desc);

alter table public.notices enable row level security;

-- 공개 읽기. 쓰기는 service_role(어드민) 만 → 별도 insert/update 정책 없음(RLS 우회).
create policy "notices public read"
  on public.notices for select using (true);

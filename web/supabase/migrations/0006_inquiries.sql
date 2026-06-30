-- 0006: 문의(Q&A) 게시판 (형님 피드백 — 문의 카테고리)
-- 비밀글 + 관리자 답변 + 로그인 필수.
-- 비밀글은 작성자(+service_role 어드민)만 조회 가능 → 비작성자에겐 목록에서도 숨김.

create table public.inquiries (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  is_secret boolean not null default false,
  answer text,                       -- 관리자 답변 (service_role 로만 기록)
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.inquiries (created_at desc);
create index on public.inquiries (user_id);

alter table public.inquiries enable row level security;

-- 읽기: 공개글은 누구나, 비밀글은 작성자만. (어드민은 service_role 로 우회)
create policy "inquiries read"
  on public.inquiries for select
  using (is_secret = false or auth.uid() = user_id);

-- 작성: 로그인 사용자가 본인 글만. (답변 update/delete 는 service_role 어드민)
create policy "inquiries insert own"
  on public.inquiries for insert
  with check (auth.uid() = user_id);

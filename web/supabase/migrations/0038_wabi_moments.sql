-- 0038: "오늘의 와비사비" 커뮤니티 게시판 (대표님 지시 — 자유게시판).
--
-- 사용자들이 우리 그릇을 일상에서 어떻게 쓰는지 사진+글로 공유한다. 인스타식
-- 커뮤니티. 로그인 사용자 누구나 올리고, 관리자는 숨김/삭제로 모더레이션한다.
-- 사진은 필수(일상 사진 공유가 목적), 글(캡션)은 선택.
--
-- RLS: 읽기=숨김 아닌 것 공개 / 작성=로그인 본인 / 삭제=본인. 관리자 숨김·삭제는
-- service_role 서버 액션(RLS 우회). 리뷰(0007·0022)와 같은 패턴.

create table public.wabi_moments (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  image_url text not null,
  body text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 목록은 노출분만 최신순 — 부분 인덱스로 가속.
create index on public.wabi_moments (created_at desc) where hidden = false;

alter table public.wabi_moments enable row level security;

create policy "wabi_moments public read"
  on public.wabi_moments for select using (hidden = false);
create policy "wabi_moments insert own"
  on public.wabi_moments for insert with check (auth.uid() = user_id);
create policy "wabi_moments delete own"
  on public.wabi_moments for delete using (auth.uid() = user_id);

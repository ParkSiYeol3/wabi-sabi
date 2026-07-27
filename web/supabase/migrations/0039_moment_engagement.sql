-- 0039: "오늘의 와비사비" 구조 고도화 — 공감(좋아요) + 댓글.
--
-- 커뮤니티 게시판(0038)에 상호작용을 추가한다. 공감은 사용자당 1건(토글),
-- 댓글은 짧은 텍스트로 소통. 둘 다 로그인 사용자 본인만 작성/철회하고, 삭제는
-- 본인만. 관리자 숨김은 리뷰(0022)·moment(0038)와 같은 service_role 서버 액션.
--
-- 집계(개수)는 서버 컴포넌트/액션에서 세션 클라이언트로 세므로 select 는 공개.
-- UI 는 총 개수 + 본인 공감 여부만 노출(누가 눌렀는지는 표시하지 않음).

-- 공감 — (moment, user) 유일. 같은 글 두 번 못 누른다(PK 로 강제).
create table public.moment_likes (
  moment_id uuid not null references public.wabi_moments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);
-- 글별 공감 수 집계 가속.
create index on public.moment_likes (moment_id);

alter table public.moment_likes enable row level security;
create policy "moment_likes public read"
  on public.moment_likes for select using (true);
create policy "moment_likes insert own"
  on public.moment_likes for insert with check (auth.uid() = user_id);
create policy "moment_likes delete own"
  on public.moment_likes for delete using (auth.uid() = user_id);

-- 댓글 — 짧은 소통. hidden 으로 관리자 모더레이션(리뷰와 동일 패턴).
create table public.moment_comments (
  id uuid primary key default gen_random_uuid (),
  moment_id uuid not null references public.wabi_moments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
-- 글별 댓글을 오래된 순으로 — 노출분만 부분 인덱스.
create index on public.moment_comments (moment_id, created_at) where hidden = false;

alter table public.moment_comments enable row level security;
create policy "moment_comments public read"
  on public.moment_comments for select using (hidden = false);
create policy "moment_comments insert own"
  on public.moment_comments for insert with check (auth.uid() = user_id);
create policy "moment_comments delete own"
  on public.moment_comments for delete using (auth.uid() = user_id);

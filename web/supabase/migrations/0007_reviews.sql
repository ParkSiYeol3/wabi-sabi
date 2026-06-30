-- 0007: 리뷰 게시판 (형님 피드백 — 리뷰 카테고리)
-- 별점(1~5) + 상품상세 노출. 로그인 사용자 작성, 누구나 읽기.
-- author_name 은 작성 시점 스냅샷(profiles RLS가 본인만 허용해 조인 불가하므로 비정규화).

create table public.reviews (
  id uuid primary key default gen_random_uuid (),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)            -- 상품당 1인 1리뷰
);

create index on public.reviews (product_id, created_at desc);
create index on public.reviews (created_at desc);

alter table public.reviews enable row level security;

-- 읽기: 누구나(공개). 작성: 로그인 본인. 삭제: 본인(+service_role 어드민).
create policy "reviews public read"
  on public.reviews for select using (true);
create policy "reviews insert own"
  on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews delete own"
  on public.reviews for delete using (auth.uid() = user_id);

-- 0022: 리뷰 신고·어드민 숨김 (moderation, #141)
--
-- 지금까지 어드민이 할 수 있는 건 hard delete 뿐이었고(0007), 고객이 부적절
-- 리뷰(욕설·광고·허위)를 알릴 수단이 없었다. 두 가지를 추가한다.
--   1) reviews.hidden — 어드민이 되돌릴 수 있는 soft-hide. 삭제와 달리 원문/신고
--      맥락이 남아 오판을 되돌릴 수 있다.
--   2) review_reports — 누가 어떤 리뷰를 왜 신고했는지. 어드민 판단 근거.

-- 1) soft-hide 플래그 ------------------------------------------------------
alter table public.reviews
  add column if not exists hidden boolean not null default false;

-- 상품 상세·목록·평점 집계는 hidden=false 만 읽는다. 부분 인덱스로 노출 조회 가속.
create index if not exists reviews_visible_product_idx
  on public.reviews (product_id, created_at desc)
  where hidden = false;

-- 공개 read 정책 교체: 숨김 리뷰는 익명/일반 사용자에게 안 보인다.
-- 어드민은 service_role 로 RLS 를 우회하므로 어드민 페이지에선 전부 보인다.
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read visible"
  on public.reviews for select
  using (hidden = false);

-- 2) 신고 테이블 -----------------------------------------------------------
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid (),
  review_id uuid not null references public.reviews (id) on delete cascade,
  -- 신고자 계정이 탈퇴해도 신고 기록은 남긴다(모더레이션 근거 보존) → set null.
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  -- 한 사람이 같은 리뷰를 여러 번 신고해 카운트를 부풀리지 못하게.
  unique (review_id, reporter_id)
);

create index if not exists review_reports_review_idx
  on public.review_reports (review_id);

alter table public.review_reports enable row level security;

-- 신고 insert: 로그인 본인만, 자기 리뷰는 신고 불가.
-- select/update/delete 정책 없음 → 신고 내역은 익명/일반 사용자에게 안 보인다
-- (신고자 신원 보호). 어드민은 service_role 로 조회한다.
create policy "review_reports insert own"
  on public.review_reports for insert
  with check (
    auth.uid() = reporter_id
    and not exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.user_id = auth.uid()
    )
  );

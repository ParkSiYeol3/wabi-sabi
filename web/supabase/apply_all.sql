-- WABI-SABI 통합 마이그레이션 (SQL Editor 붙여넣기용)
-- 0001_init + 0002_rls + seed 순서

-- WABI-SABI 초기 스키마 (ERD 기반)
-- 확정: profiles, products, orders, order_items, gift_options
-- ⚠️ 초안(확정 필요): categories, wishlist, addresses 컬럼 — 브리핑에서 미확정 표시됨
-- Supabase auth.users 를 USERS 로 사용, profiles 가 1:1 확장.

create extension if not exists "pgcrypto";

-- ── PROFILES (auth.users 확장) ──────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now()
);

-- 회원가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── CATEGORIES ⚠️ 초안 ─────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid (),
  slug text unique not null,          -- tableware / objects / craft / gifts
  name_ko text not null,
  name_en text not null,
  sort_order int not null default 0
);

-- ── PRODUCTS ───────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid (),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text unique,
  price int not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  description text,
  material text,        -- 소재
  size text,            -- 사이즈
  care text,            -- 주의사항
  images jsonb not null default '[]'::jsonb, -- 멀티이미지 URL 배열
  is_active boolean not null default true,
  is_monthly boolean not null default false, -- 이 달의 상품 (Shop monthly 탭)
  created_at timestamptz not null default now()
);
create index on public.products (is_monthly) where is_monthly;

-- ── ORDERS ─────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references public.profiles (id) on delete set null,
  order_number text unique not null,
  status text not null default 'pending', -- pending/paid/shipping/delivered/cancelled
  total_price int not null check (total_price >= 0),
  recipient text not null,
  phone text not null,
  address text not null,
  delivery_memo text,
  tracking_number text,
  ordered_at timestamptz not null default now()
);

-- ── ORDER_ITEMS ────────────────────────────────────────────
create table public.order_items (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,  -- 주문 시점 스냅샷
  price int not null check (price >= 0),
  quantity int not null check (quantity > 0)
);

-- ── GIFT_OPTIONS (주문당 0~1) ──────────────────────────────
create table public.gift_options (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  package_type text,
  extra_price int not null default 0 check (extra_price >= 0),
  sender_name text,
  message text
);

-- ── WISHLIST ⚠️ 초안 ───────────────────────────────────────
create table public.wishlist (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ── ADDRESSES ⚠️ 초안 ──────────────────────────────────────
create table public.addresses (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipient text not null,
  phone text not null,
  postcode text,
  address text not null,
  detail text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── 인덱스 ──────────────────────────────────────────────────
create index on public.products (category_id);
create index on public.orders (user_id);
create index on public.order_items (order_id);
create index on public.wishlist (user_id);
create index on public.addresses (user_id);


-- Row Level Security 정책
-- 공개 읽기: categories, products(활성)  /  소유자 전용: profiles, orders, order_items, gift_options, wishlist, addresses

alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.gift_options  enable row level security;
alter table public.wishlist      enable row level security;
alter table public.addresses     enable row level security;

-- ── 공개 카탈로그 ──────────────────────────────────────────
create policy "categories public read"
  on public.categories for select using (true);

create policy "products public read"
  on public.products for select using (is_active = true);

-- ── PROFILES (본인만) ──────────────────────────────────────
create policy "own profile select"
  on public.profiles for select using (auth.uid() = id);
create policy "own profile update"
  on public.profiles for update using (auth.uid() = id);

-- ── ORDERS (본인만) ────────────────────────────────────────
create policy "own orders select"
  on public.orders for select using (auth.uid() = user_id);
create policy "own orders insert"
  on public.orders for insert with check (auth.uid() = user_id);

-- ── ORDER_ITEMS (소속 주문이 본인 것일 때) ─────────────────
create policy "own order_items select"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

-- ── GIFT_OPTIONS (소속 주문이 본인 것일 때) ────────────────
create policy "own gift_options select"
  on public.gift_options for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

-- ── WISHLIST (본인만, 전체 CRUD) ───────────────────────────
create policy "own wishlist all"
  on public.wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── ADDRESSES (본인만, 전체 CRUD) ──────────────────────────
create policy "own addresses all"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 참고: 주문 생성 시 order_items/gift_options insert, 재고 차감, 어드민(서비스롤) 정책은
-- 결제 플로우 확정 후 별도 마이그레이션(0003+)에서 추가.


-- seed
-- 카테고리 시드 — Shop 물건 종류 7종 (형님 피드백 IA)
insert into public.categories (slug, name_ko, name_en, sort_order) values
  ('plate',   '접시',     'Plate',   1),
  ('bowl',    '볼',       'Bowl',    2),
  ('cup',     '컵',       'Cup',     3),
  ('cutlery', '커트러리', 'Cutlery', 4),
  ('life',    '리빙',     'Life',    5),
  ('gift',    '선물',     'Gift',    6),
  ('craft',   '공예',     'Craft',   7)
on conflict (slug) do update
  set name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      sort_order = excluded.sort_order;


-- ── NOTICES (0005) ─────────────────────────────────────────
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists notices_created_at_idx on public.notices (created_at desc);
alter table public.notices enable row level security;
create policy "notices public read"
  on public.notices for select using (true);


-- ── INQUIRIES (0006) ───────────────────────────────────────
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  is_secret boolean not null default false,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists inquiries_user_id_idx on public.inquiries (user_id);
alter table public.inquiries enable row level security;
create policy "inquiries read"
  on public.inquiries for select
  using (is_secret = false or auth.uid() = user_id);
create policy "inquiries insert own"
  on public.inquiries for insert
  with check (auth.uid() = user_id);


-- ── REVIEWS (0007) ─────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid (),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_created_idx on public.reviews (product_id, created_at desc);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
alter table public.reviews enable row level security;
create policy "reviews public read"
  on public.reviews for select using (true);
create policy "reviews insert own"
  on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews delete own"
  on public.reviews for delete using (auth.uid() = user_id);


-- ── PROFILE ROLE (0008) ────────────────────────────────────
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));
-- 권한 상승 차단: 사용자는 name 만 수정 가능, role/email 등은 service_role 만.
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

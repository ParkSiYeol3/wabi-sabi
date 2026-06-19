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
  created_at timestamptz not null default now()
);

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

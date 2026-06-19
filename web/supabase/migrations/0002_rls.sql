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

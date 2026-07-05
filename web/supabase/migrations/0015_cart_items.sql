-- 0015: 계정별 서버 장바구니 (WSB-013 확장)
-- 기존 장바구니는 localStorage(게스트) 전용 — 계정과 무연동이라 로그인/로그아웃과
-- 장바구니가 엇갈렸다. 계정 장바구니를 서버에 저장해 로그인 시 복원, 로그아웃 시
-- 로컬만 비운다. 비로그인은 여전히 게스트 로컬 장바구니 사용(로그인 시 병합).
--
-- 저장은 product_id + quantity 만 — 이름·가격·이미지는 조회 시 products 조인으로
-- 항상 최신값 사용(가격 변동 반영, 비활성/삭제 상품 자동 제외).
-- 사용자 클라이언트가 본인 것만 직접 CRUD(wishlist 와 동일 패턴, RLS 보호).

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null default 1 check (quantity > 0 and quantity <= 99),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index cart_items_user_idx on public.cart_items (user_id);

alter table public.cart_items enable row level security;

create policy "own cart_items all"
  on public.cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 0059: 쿠폰 (대표님 — 첫 회원가입 -3000원 등). 지갑(wallet) 모델.
--
-- coupons        = 쿠폰 정의(코드·할인·조건). 관리자(service_role)가 생성.
-- user_coupons   = 사용자 지갑(발급/사용 이력). 가입 트리거·관리자가 발급, 결제
--                  확정 시 used_at 기록. 사용자는 자기 지갑만 읽는다(RLS).
-- orders         = 적용 쿠폰(coupon_id)·할인액(discount) 스냅샷.
--
-- v1(수정 예정): 코드 직접 입력 없이 '내 지갑의 유효 쿠폰 선택' 방식. 할인은 상품+
-- 옵션 subtotal 에만 적용(배송비 제외). 무료배송 판정은 할인 전 subtotal 기준.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value int not null check (discount_value > 0),   -- fixed=원, percent=%
  min_order int not null default 0 check (min_order >= 0),  -- 최소 주문(subtotal)
  max_discount int check (max_discount is null or max_discount > 0), -- percent 상한(원)
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses int check (max_uses is null or max_uses >= 0),   -- 전체 총 사용 한도
  used_count int not null default 0 check (used_count >= 0),
  per_user_limit int not null default 1 check (per_user_limit >= 1),
  is_active boolean not null default true,
  auto_issue_signup boolean not null default false,          -- 가입 시 자동 발급 대상
  created_at timestamptz not null default now()
);

create table if not exists public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  -- 지갑엔 쿠폰당 1행(가입 자동발급 재실행·중복발급 방지). per_user_limit>1 은 v2.
  unique (user_id, coupon_id)
);
create index if not exists user_coupons_user_idx
  on public.user_coupons(user_id) where used_at is null;

alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id),
  add column if not exists discount int not null default 0 check (discount >= 0);

-- RLS ----------------------------------------------------------------------
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;

-- 쿠폰 정의는 공개 읽기(활성만) — 지갑 조인·표시용. 코드·할인은 마케팅 정보라 비밀 아님.
-- 생성·수정은 service_role 전용(정책 없음 = 일반 사용자 쓰기 불가).
drop policy if exists "coupons public read active" on public.coupons;
create policy "coupons public read active"
  on public.coupons for select using (is_active);

-- 지갑은 본인 것만 읽는다. 발급·사용은 service_role(트리거·확정 RPC·관리자) 전용.
drop policy if exists "own coupons read" on public.user_coupons;
create policy "own coupons read"
  on public.user_coupons for select using (auth.uid() = user_id);

-- 가입 자동 발급 -------------------------------------------------------------
-- handle_new_user 확장 — profiles·동의 기록에 더해, auto_issue_signup 쿠폰을 지갑에
-- 넣는다. 소셜/이메일 공통(가입 트리거 하나). 재실행·중복은 unique 로 무시.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  m jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, m ->> 'name');

  if m ? 'consent_terms_version' then
    insert into public.user_consents (user_id, type, version, agreed)
    values
      (new.id, 'terms', m ->> 'consent_terms_version', true),
      (new.id, 'privacy',
        coalesce(m ->> 'consent_privacy_version', m ->> 'consent_terms_version'),
        true),
      (new.id, 'marketing',
        coalesce(m ->> 'consent_terms_version', ''),
        coalesce((m ->> 'consent_marketing')::boolean, false));
  end if;

  -- 가입 축하 쿠폰 등 자동 발급 대상 — 지갑에 넣는다(중복은 unique 로 무시).
  insert into public.user_coupons (user_id, coupon_id)
  select new.id, c.id
  from public.coupons c
  where c.auto_issue_signup and c.is_active
  on conflict (user_id, coupon_id) do nothing;

  return new;
end;
$$;

-- 결제 확정 재작성 — 0058(값별 재고) 로직에 쿠폰 사용 확정을 더한다.
create or replace function public.confirm_order_paid(p_order_id uuid, p_amount int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_status text;
  v_short int;
  v_user_id uuid;
  v_coupon_id uuid;
begin
  -- ① 주문 잠금 + 상태·금액 검증 (멱등)
  select total_price, status, user_id, coupon_id
    into v_total, v_status, v_user_id, v_coupon_id
  from orders where id = p_order_id
  for update;

  if v_total is null then return 'not_found'; end if;
  if v_status = 'paid' then return 'already_paid'; end if;
  if v_status <> 'pending' then return 'not_pending'; end if;
  if v_total <> p_amount then return 'amount_mismatch'; end if;

  -- ② 상품 행 id 순 잠금(교착 방지)
  perform 1
  from products p
  where p.id in (select product_id from order_items where order_id = p_order_id)
  order by p.id
  for update;

  -- ②' 값별 재고 행 잠금(옵션 재고 관리 상품)
  perform 1
  from order_items oi
  join products p on p.id = oi.product_id
  join product_option_stock pos
    on pos.product_id = p.id
   and pos.value = (
     select e->>'value' from jsonb_array_elements(oi.options) e
      where e->>'name' = p.stock_option limit 1)
  where oi.order_id = p_order_id and p.stock_option is not null
  order by pos.product_id, pos.value
  for update;

  -- ③ 부족 검증 — flat 재고
  select count(*) into v_short
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = p_order_id
    and p.stock_option is null
    and p.stock < oi.quantity;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  -- ③' 부족 검증 — 값별 재고
  select count(*) into v_short
  from order_items oi
  join products p on p.id = oi.product_id
  left join product_option_stock pos
    on pos.product_id = p.id
   and pos.value = (
     select e->>'value' from jsonb_array_elements(oi.options) e
      where e->>'name' = p.stock_option limit 1)
  where oi.order_id = p_order_id
    and p.stock_option is not null
    and coalesce(pos.stock, 0) < oi.quantity;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  update orders set status = 'paid' where id = p_order_id;

  -- ④ flat 재고 차감
  update products p
  set stock = p.stock - oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id
    and p.stock_option is null;

  -- ④' 값별 재고 차감
  update product_option_stock pos
  set stock = pos.stock - oi.quantity
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = p_order_id
    and p.stock_option is not null
    and pos.product_id = p.id
    and pos.value = (
      select e->>'value' from jsonb_array_elements(oi.options) e
       where e->>'name' = p.stock_option limit 1);

  -- ④'' 관리 상품의 products.stock 을 값별 합으로 재동기화
  update products p
  set stock = coalesce(
    (select sum(s.stock) from product_option_stock s where s.product_id = p.id), 0)
  where p.stock_option is not null
    and p.id in (select product_id from order_items where order_id = p_order_id);

  -- ⑤ 쿠폰 사용 확정(0059) — 주문에 적용된 쿠폰을 지갑에서 사용 처리 + 총 사용수 증가.
  --    할인액은 이미 total_price 에 반영돼 있고 결제가 그 금액으로 승인됐다.
  if v_coupon_id is not null and v_user_id is not null then
    update user_coupons
    set used_at = now(), order_id = p_order_id
    where user_id = v_user_id and coupon_id = v_coupon_id and used_at is null;
    update coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  return 'confirmed';
end;
$$;

revoke execute on function public.confirm_order_paid(uuid, int) from public, anon, authenticated;

-- 주문 취소·환불 시 쿠폰 복구 — cancel_paid_order 도 쿠폰을 지갑에 되돌린다.
-- (사용 확정된 쿠폰만; used_count 도 감소). 기존 재고 복원 로직은 유지.
-- 함수 시그니처·기존 동작은 0011 을 따르되, 확정 취소 성공 경로에 쿠폰 복구를 더한다.
create or replace function public.cancel_paid_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_user_id uuid;
  v_coupon_id uuid;
begin
  select status, user_id, coupon_id into v_status, v_user_id, v_coupon_id
  from orders where id = p_order_id
  for update;

  if v_status is null then return 'not_found'; end if;
  if v_status = 'cancelled' then return 'already_cancelled'; end if; -- 멱등(환불 재시도)
  if v_status <> 'paid' then return 'not_cancellable'; end if;    -- 배송 시작 후 등

  -- 상품 행 잠금 후 재고 복원(flat) — 0011 원칙 유지.
  perform 1 from products p
  where p.id in (select product_id from order_items where order_id = p_order_id)
  order by p.id for update;

  update products p
  set stock = p.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id
    and p.stock_option is null;

  -- 값별 재고 복원 + 합 재동기화.
  update product_option_stock pos
  set stock = pos.stock + oi.quantity
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = p_order_id
    and p.stock_option is not null
    and pos.product_id = p.id
    and pos.value = (
      select e->>'value' from jsonb_array_elements(oi.options) e
       where e->>'name' = p.stock_option limit 1);

  update products p
  set stock = coalesce(
    (select sum(s.stock) from product_option_stock s where s.product_id = p.id), 0)
  where p.stock_option is not null
    and p.id in (select product_id from order_items where order_id = p_order_id);

  update orders set status = 'cancelled' where id = p_order_id;

  -- 쿠폰 복구 — 사용 처리됐던 지갑 항목을 되돌리고 총 사용수 감소.
  if v_coupon_id is not null and v_user_id is not null then
    update user_coupons
    set used_at = null, order_id = null
    where user_id = v_user_id and coupon_id = v_coupon_id and order_id = p_order_id;
    update coupons set used_count = greatest(0, used_count - 1) where id = v_coupon_id;
  end if;

  return 'cancelled';
end;
$$;

revoke execute on function public.cancel_paid_order(uuid) from public, anon, authenticated;

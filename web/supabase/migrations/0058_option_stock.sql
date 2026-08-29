-- 0058: 옵션 값별 재고 (대표님 — 예: 색상 브라운 3개 / 옐로우 5개)
--
-- 기존 재고는 products.stock 단일 숫자. 상품이 옵션 한 그룹(예: 색상)의 값마다
-- 재고를 따로 관리해야 할 때가 있다. 정합성(초과판매 방지)을 위해 값별 재고는
-- 별도 행으로 두고 원자적으로 잠금·차감한다(JSONB 에 넣으면 동시성 문제 재발).
--
-- 설계(단일 옵션 그룹 값별 — 대표님 선택):
--   · products.stock_option = 재고를 담는 옵션 그룹 이름(null 이면 종전대로 flat stock)
--   · product_option_stock(product_id, value, stock) = 그 그룹의 값마다 재고 1행
--   · products.stock 은 관리 상품에선 '값별 재고의 합'으로 유지(대시보드·품절 판정·
--     상세 SOLD OUT 등 기존 로직이 그대로 동작하도록). 저장 시 앱이 합을 넣고,
--     결제 확정 RPC 도 차감 후 합을 다시 맞춘다.

alter table public.products
  add column if not exists stock_option text;

create table if not exists public.product_option_stock (
  product_id uuid not null references public.products(id) on delete cascade,
  value text not null,
  stock int not null default 0 check (stock >= 0),
  primary key (product_id, value)
);

-- 공개 읽기(상세에서 값별 품절 판정에 필요) — 수량 자체는 앱이 노출하지 않고
-- 0 이하를 '품절'로만 환산해 쓴다. 쓰기는 service_role 전용(RLS 로 anon/auth 차단).
alter table public.product_option_stock enable row level security;

drop policy if exists "option stock public read" on public.product_option_stock;
create policy "option stock public read"
  on public.product_option_stock for select
  using (true);

-- 결제 확정 재작성 — flat stock(0010) 로직에 값별 재고 잠금·검증·차감을 더한다.
-- 원칙은 0010 그대로: 주문 행 FOR UPDATE → 상품/값별 행 FOR UPDATE → 잠금 하
-- 검증(부족 시 cancelled + out_of_stock) → 정확 차감.
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
begin
  -- ① 주문 잠금 + 상태·금액 검증 (멱등)
  select total_price, status into v_total, v_status
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

  -- ②' 값별 재고 행 잠금(옵션 재고 관리 상품). 주문 라인이 고른 값 = 그 상품의
  --     stock_option 그룹에서 손님이 선택한 값(order_items.options 스냅샷).
  perform 1
  from order_items oi
  join products p on p.id = oi.product_id
  join product_option_stock pos
    on pos.product_id = p.id
   and pos.value = (
     select e->>'value'
       from jsonb_array_elements(oi.options) e
      where e->>'name' = p.stock_option
      limit 1)
  where oi.order_id = p_order_id and p.stock_option is not null
  order by pos.product_id, pos.value
  for update;

  -- ③ 부족 검증 — flat 재고(옵션 미관리 상품)
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

  -- ③' 부족 검증 — 값별 재고(옵션 관리 상품). 매칭 값이 없으면(coalesce 0) 부족 처리.
  select count(*) into v_short
  from order_items oi
  join products p on p.id = oi.product_id
  left join product_option_stock pos
    on pos.product_id = p.id
   and pos.value = (
     select e->>'value'
       from jsonb_array_elements(oi.options) e
      where e->>'name' = p.stock_option
      limit 1)
  where oi.order_id = p_order_id
    and p.stock_option is not null
    and coalesce(pos.stock, 0) < oi.quantity;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  update orders set status = 'paid' where id = p_order_id;

  -- ④ flat 재고 차감(옵션 미관리)
  update products p
  set stock = p.stock - oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id
    and p.stock_option is null;

  -- ④' 값별 재고 차감(옵션 관리)
  update product_option_stock pos
  set stock = pos.stock - oi.quantity
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = p_order_id
    and p.stock_option is not null
    and pos.product_id = p.id
    and pos.value = (
      select e->>'value'
        from jsonb_array_elements(oi.options) e
       where e->>'name' = p.stock_option
       limit 1);

  -- ④'' 관리 상품의 products.stock 을 값별 재고 합으로 재동기화
  update products p
  set stock = coalesce(
    (select sum(s.stock) from product_option_stock s where s.product_id = p.id), 0)
  where p.stock_option is not null
    and p.id in (select product_id from order_items where order_id = p_order_id);

  return 'confirmed';
end;
$$;

revoke execute on function public.confirm_order_paid(uuid, int) from public, anon, authenticated;

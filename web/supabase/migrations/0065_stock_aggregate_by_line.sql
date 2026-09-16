-- 0065: 주문 항목이 같은 상품으로 여러 줄일 수 있게 되면서 드러난 재고 계산 결함 (#677).
--
-- 0064 로 장바구니 줄이 "상품+옵션 조합" 단위가 됐다. 그래서 한 주문에 같은 상품이
-- 옵션만 다른 두 줄(예: 블랙 1개, 라임 1개)로 들어올 수 있다. 그런데 확정·취소 RPC 는
-- 주문 항목을 **줄 단위로** 보고 있었다:
--
--   ⚠ 부족 검증: `p.stock - 1 < oi.quantity` 를 줄마다 따로 비교 → 재고 3개에
--      2개 줄 + 2개 줄(합 4개)이 통과한다.
--   ⚠ 차감·복원: `update products p ... from order_items oi where oi.product_id = p.id`
--      는 Postgres 에서 대상 행이 여러 oi 와 매치돼도 **한 번만** 갱신된다(임의의 한
--      행 기준). 같은 상품 2줄(2개+1개)이면 3이 아니라 2만 깎이고, 취소 때도 한 줄치만
--      되돌아온다.
--
-- 그래서 세 곳 모두 order_items 를 **상품별(옵션 관리 상품은 상품+옵션값별)로 합산**한
-- 뒤 비교·갱신한다. 나머지(잠금 순서·매장 예약분 1개·쿠폰 확정/복구)는 0060·0059 그대로.

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

  -- ③ 부족 검증 — flat 재고(매장 예약분 1개 제외). 상품별 합산 수량과 비교한다.
  select count(*) into v_short
  from (
    select oi.product_id, sum(oi.quantity)::int as qty
    from order_items oi
    join products p on p.id = oi.product_id
    where oi.order_id = p_order_id and p.stock_option is null
    group by oi.product_id
  ) w
  join products p on p.id = w.product_id
  where p.stock - 1 < w.qty;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  -- ③' 부족 검증 — 값별 재고(매장 예약분 1개 제외). 상품+옵션값별 합산 수량과 비교.
  select count(*) into v_short
  from (
    select l.product_id, l.value, sum(l.quantity)::int as qty
    from (
      select oi.product_id,
             (select e->>'value' from jsonb_array_elements(oi.options) e
               where e->>'name' = p.stock_option limit 1) as value,
             oi.quantity
      from order_items oi
      join products p on p.id = oi.product_id
      where oi.order_id = p_order_id and p.stock_option is not null
    ) l
    group by l.product_id, l.value
  ) w
  left join product_option_stock pos
    on pos.product_id = w.product_id and pos.value = w.value
  where coalesce(pos.stock, 0) - 1 < w.qty;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  update orders set status = 'paid' where id = p_order_id;

  -- ④ flat 재고 차감 — 합산 후 상품당 한 번만 갱신(줄마다 갱신되지 않는다).
  update products p
  set stock = p.stock - w.qty
  from (
    select oi.product_id, sum(oi.quantity)::int as qty
    from order_items oi
    where oi.order_id = p_order_id
    group by oi.product_id
  ) w
  where w.product_id = p.id and p.stock_option is null;

  -- ④' 값별 재고 차감 — 상품+옵션값별 합산.
  update product_option_stock pos
  set stock = pos.stock - w.qty
  from (
    select l.product_id, l.value, sum(l.quantity)::int as qty
    from (
      select oi.product_id,
             (select e->>'value' from jsonb_array_elements(oi.options) e
               where e->>'name' = p.stock_option limit 1) as value,
             oi.quantity
      from order_items oi
      join products p on p.id = oi.product_id
      where oi.order_id = p_order_id and p.stock_option is not null
    ) l
    group by l.product_id, l.value
  ) w
  where pos.product_id = w.product_id and pos.value = w.value;

  -- ④'' 관리 상품의 products.stock 을 값별 합으로 재동기화
  update products p
  set stock = coalesce(
    (select sum(s.stock) from product_option_stock s where s.product_id = p.id), 0)
  where p.stock_option is not null
    and p.id in (select product_id from order_items where order_id = p_order_id);

  -- ⑤ 쿠폰 사용 확정(0059)
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
grant  execute on function public.confirm_order_paid(uuid, int) to service_role;

-- 취소·환불 — 복원도 같은 이유로 합산해야 한다(한 줄치만 되돌아오던 문제).
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
  set stock = p.stock + w.qty
  from (
    select oi.product_id, sum(oi.quantity)::int as qty
    from order_items oi
    where oi.order_id = p_order_id
    group by oi.product_id
  ) w
  where w.product_id = p.id and p.stock_option is null;

  -- 값별 재고 복원 + 합 재동기화.
  update product_option_stock pos
  set stock = pos.stock + w.qty
  from (
    select l.product_id, l.value, sum(l.quantity)::int as qty
    from (
      select oi.product_id,
             (select e->>'value' from jsonb_array_elements(oi.options) e
               where e->>'name' = p.stock_option limit 1) as value,
             oi.quantity
      from order_items oi
      join products p on p.id = oi.product_id
      where oi.order_id = p_order_id and p.stock_option is not null
    ) l
    group by l.product_id, l.value
  ) w
  where pos.product_id = w.product_id and pos.value = w.value;

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
grant  execute on function public.cancel_paid_order(uuid) to service_role;

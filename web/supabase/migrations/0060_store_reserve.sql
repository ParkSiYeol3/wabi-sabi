-- 0060 매장 비치용 예약 재고(대표님) — "재고 1개 남으면 품절".
--
-- 대표님 요청: 매장에 최소 1개는 남겨두기 위해, 온라인에서는 실재고가 1개
-- 남으면 품절 처리한다. 즉 마지막 1개는 절대 팔지 않는다.
--
-- 표시(품절 뱃지)·체크아웃 검증은 앱 코드(lib/inventory STORE_RESERVE=1)에서
-- 처리하지만, 동시 주문 경합에서도 마지막 1개가 팔리지 않도록 결제 확정 RPC의
-- 부족 검증 임계도 예약분만큼 올린다. 여기 상수(1)는 lib/inventory 의
-- STORE_RESERVE 와 반드시 일치해야 한다.
--
-- 0059 의 confirm_order_paid 와 동일하되 ③·③'(부족 검증)만 변경:
--   flat   : p.stock            < oi.quantity  →  p.stock - 1            < oi.quantity
--   값별   : coalesce(pos.stock,0) < oi.quantity  →  coalesce(pos.stock,0) - 1 < oi.quantity
-- 차감(④·④')과 쿠폰 확정(⑤)은 그대로. 가드가 stock >= qty+1 을 보장하므로 차감
-- 후에도 최소 1개가 남는다.

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

  -- ③ 부족 검증 — flat 재고(매장 예약분 1개 제외한 판매 가능 수량 기준)
  select count(*) into v_short
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = p_order_id
    and p.stock_option is null
    and p.stock - 1 < oi.quantity;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  -- ③' 부족 검증 — 값별 재고(매장 예약분 1개 제외)
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
    and coalesce(pos.stock, 0) - 1 < oi.quantity;
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

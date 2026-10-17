-- 0079 재고 0개일 때 품절(대표님 2026-10-17, #836) — 매장 비치용 예약 1개(0060) 해제.
--
-- 대표님 요청: "재고 0개 되면 품절처리". 0060 이후로는 실재고가 1개 남으면 손님에게
-- 품절로 보이고, 결제 확정 RPC 도 마지막 1개를 팔지 않았다. 이제 마지막 1개까지 판다.
--
-- 앱 쪽(lib/inventory STORE_RESERVE=0)과 짝이다. 0065 의 confirm_order_paid 와
-- 동일하되 ③·③'(부족 검증)에서 예약분 1개만 뺐다:
--   flat : p.stock - 1 < w.qty                →  p.stock < w.qty
--   값별 : coalesce(pos.stock, 0) - 1 < w.qty  →  coalesce(pos.stock, 0) < w.qty
-- 잠금 순서·합산 차감·쿠폰 확정은 그대로. cancel_paid_order 는 예약분과 무관해 손대지 않는다.
--
-- ⚠ 운영 DB 에 먼저 적용한 뒤 앱을 배포한다. 반대 순서면 앱은 마지막 1개 결제를 받는데
--   RPC 가 out_of_stock 으로 주문을 취소한다(결제는 승인된 채). 이 순서면 배포 전까지
--   앱이 더 엄격(1개 남으면 품절)할 뿐이라 안전하다.
--   되돌릴 땐 0065 의 정의를 다시 적용하고 STORE_RESERVE=1.

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

  -- ③ 부족 검증 — flat 재고. 상품별 합산 수량과 비교한다(예약분 없음, 0079).
  select count(*) into v_short
  from (
    select oi.product_id, sum(oi.quantity)::int as qty
    from order_items oi
    join products p on p.id = oi.product_id
    where oi.order_id = p_order_id and p.stock_option is null
    group by oi.product_id
  ) w
  join products p on p.id = w.product_id
  where p.stock < w.qty;
  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  -- ③' 부족 검증 — 값별 재고. 상품+옵션값별 합산 수량과 비교(예약분 없음, 0079).
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
  where coalesce(pos.stock, 0) < w.qty;
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

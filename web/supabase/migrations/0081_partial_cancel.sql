-- 0081 품절 상품 부분취소·부분환불(대표님 2026-10-17, #844).
--
-- 지금까지는 배송 전 주문의 전체 취소(cancel_paid_order, 전액 환불)만 있었다. 대표님 정책:
--   · 취소한 상품 금액만 환불한다. 배송비·쿠폰은 그대로 둔다.
--   · 한 줄을 전부 취소하면 그 줄의 추가옵션(선물포장 등, 줄당 1회 부과) 금액도 환불한다.
--   · 배송 전(paid)만. 마지막 남은 상품까지 취소하려면 전체 취소를 쓴다(배송비까지 환불).
--
-- 설계: 부분취소하면 orders.total_price 와 order_items.quantity 를 **현재값으로 줄이고**,
-- 누계는 orders.refunded_amount·order_items.cancelled_quantity 에 남긴다. 그래서
--   · 매출·회원 구매액·베스트셀러·인기순(전부 total_price·quantity 합)이 수정 없이 순액이 되고
--   · 이후 전체 취소(cancel_paid_order)는 남은 수량만 재고로 되돌리며
--   · 토스 전액 취소(cancelAmount 없음)는 남은 잔액만 환불하고, 취소 메일 금액도 남은 금액이 된다.
-- 원래 결제 금액 = total_price + refunded_amount, 원래 수량 = quantity + cancelled_quantity.
--
-- 수량 0 줄이 생기므로 quantity 체크를 > 0 에서 >= 0 으로 푼다(원래 수량은 여전히 1 이상).
-- 0 줄은 '구매함'이 아니므로 리뷰 작성 자격(RLS)에서 뺀다.
--
-- ⚠ 운영 DB 에 먼저 적용한 뒤 앱을 배포한다(새 컬럼을 select 하는 화면이 있다).

alter table public.order_items
  add column if not exists cancelled_quantity int not null default 0
    check (cancelled_quantity >= 0);

alter table public.order_items drop constraint if exists order_items_quantity_check;
alter table public.order_items
  add constraint order_items_quantity_check
    check (quantity >= 0 and quantity + cancelled_quantity > 0);

alter table public.orders
  add column if not exists refunded_amount int not null default 0
    check (refunded_amount >= 0);

-- 부분취소 기록 — 줄·수량·금액·환불 시각. refunded_at 이 비어 있으면 토스 환불이 아직
-- 확인되지 않은 것(관리자 화면에 '환불 다시 시도'). 관리자 서버(service_role)만 읽고 쓴다.
-- 손님 화면은 order_items.cancelled_quantity·orders.refunded_amount 로 충분하다.
-- ⚠ order_item_id 에 FK 를 걸지 않는다. orders·order_items 둘 다 FK 로 가리키면 PostgREST 가
--   이 표를 둘을 잇는 연결 표로 볼 수 있고, 그러면 orders → order_items 임베드(관리자·마이페이지·
--   메일 쿼리 전부)가 '관계가 둘'이라 실패한다(PGRST201). 줄은 주문과 함께만 지워지고(cascade)
--   그때 이 기록도 order_id cascade 로 함께 지워지므로 FK 없이도 고아가 생기지 않는다.
create table if not exists public.order_partial_cancels (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  amount int not null check (amount > 0),
  reason text not null,
  refunded_at timestamptz,
  -- 마지막 토스 환불 시도 시각. 1분 안의 겹친 시도를 막는다(claim_partial_refund).
  refund_attempted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists order_partial_cancels_order_id_idx
  on public.order_partial_cancels (order_id);
alter table public.order_partial_cancels enable row level security;
revoke all on public.order_partial_cancels from anon, authenticated;

-- 부분취소 RPC. 결과는 jsonb {result, cancel_id?, amount?}.
--   cancelled        — 처리됨(cancel_id·amount 포함). 이제 토스에 amount 만큼 환불 요청
--   not_found / not_cancellable(paid 아님) / item_not_found / invalid_quantity
--   use_full_cancel  — 이걸 빼면 남는 상품이 없다 → 전체 취소로
--   zero_amount      — 환불할 금액이 0(가격 0 줄)
--   exceeds_paid     — 환불액이 남은 결제 금액 이상(큰 쿠폰 할인 등) → 전체 취소로
-- 잠금 순서: 주문 → 주문 줄 → 상품 → 값별 재고. confirm/cancel RPC 와 같은 방향(주문 먼저).
create or replace function public.partial_cancel_order_item(
  p_order_id uuid,
  p_item_id uuid,
  p_quantity int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_total int;
  v_item_product uuid;
  v_item_name text;
  v_item_price int;
  v_item_qty int;
  v_item_addons jsonb;
  v_item_options jsonb;
  v_units int;
  v_addon_total int;
  v_amount int;
  v_stock_option text;
  v_value text;
  v_cancel_id uuid;
begin
  select status, total_price into v_status, v_total
  from orders where id = p_order_id
  for update;
  if v_status is null then return jsonb_build_object('result', 'not_found'); end if;
  if v_status <> 'paid' then return jsonb_build_object('result', 'not_cancellable'); end if;

  select product_id, product_name, price, quantity, addons, options
    into v_item_product, v_item_name, v_item_price, v_item_qty, v_item_addons, v_item_options
  from order_items
  where id = p_item_id and order_id = p_order_id
  for update;
  if v_item_name is null then return jsonb_build_object('result', 'item_not_found'); end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > v_item_qty then
    return jsonb_build_object('result', 'invalid_quantity');
  end if;

  select coalesce(sum(quantity), 0) into v_units
  from order_items where order_id = p_order_id;
  if v_units - p_quantity < 1 then
    return jsonb_build_object('result', 'use_full_cancel');
  end if;

  -- 줄 전체를 취소할 때만 추가옵션 금액(줄당 1회)을 함께 환불.
  v_addon_total := case
    when p_quantity = v_item_qty then coalesce(
      (select sum((a->>'price')::int) from jsonb_array_elements(v_item_addons) a), 0)
    else 0
  end;
  v_amount := v_item_price * p_quantity + v_addon_total;
  if v_amount < 1 then return jsonb_build_object('result', 'zero_amount'); end if;
  if v_amount >= v_total then return jsonb_build_object('result', 'exceeds_paid'); end if;

  update order_items
  set quantity = quantity - p_quantity,
      cancelled_quantity = cancelled_quantity + p_quantity
  where id = p_item_id;

  update orders
  set total_price = total_price - v_amount,
      refunded_amount = refunded_amount + v_amount
  where id = p_order_id;

  -- 재고 복원(삭제된 상품이면 건너뜀). 옵션 관리 상품은 값별 재고 + 합 재동기화.
  if v_item_product is not null then
    select stock_option into v_stock_option
    from products where id = v_item_product
    for update;
    if found then
      if v_stock_option is null then
        update products set stock = stock + p_quantity where id = v_item_product;
      else
        select e->>'value' into v_value
        from jsonb_array_elements(v_item_options) e
        where e->>'name' = v_stock_option
        limit 1;
        update product_option_stock
        set stock = stock + p_quantity
        where product_id = v_item_product and value = v_value;
        update products p
        set stock = coalesce(
          (select sum(s.stock) from product_option_stock s where s.product_id = p.id), 0)
        where p.id = v_item_product;
      end if;
    end if;
  end if;

  insert into order_partial_cancels (order_id, order_item_id, product_name, quantity, amount, reason)
  values (p_order_id, p_item_id, v_item_name, p_quantity, v_amount, coalesce(nullif(trim(p_reason), ''), '부분취소'))
  returning id into v_cancel_id;

  return jsonb_build_object('result', 'cancelled', 'cancel_id', v_cancel_id, 'amount', v_amount);
end;
$$;

revoke execute on function public.partial_cancel_order_item(uuid, uuid, int, text) from public, anon, authenticated;
grant  execute on function public.partial_cancel_order_item(uuid, uuid, int, text) to service_role;

-- 환불 시도 선점 — 같은 기록에 토스 환불이 동시에 두 번 나가지 않게 한다. 환불 전이고
-- 마지막 시도가 1분 넘게 지났을 때만 시각을 찍고 행을 돌려준다(앱의 토스 호출은 20초 제한).
create or replace function public.claim_partial_refund(p_cancel_id uuid)
returns table (order_id uuid, amount int, reason text, attempted_at timestamptz)
language sql
security definer
set search_path = public
as $$
  update order_partial_cancels c
  set refund_attempted_at = now()
  where c.id = p_cancel_id
    and c.refunded_at is null
    and (c.refund_attempted_at is null or c.refund_attempted_at < now() - interval '1 minute')
  returning c.order_id, c.amount, c.reason, c.refund_attempted_at;
$$;

revoke execute on function public.claim_partial_refund(uuid) from public, anon, authenticated;
grant  execute on function public.claim_partial_refund(uuid) to service_role;

-- 리뷰 작성 자격(0021) — 전부 취소된 줄(quantity 0)은 구매가 아니다.
drop policy if exists "reviews insert own purchased" on public.reviews;
create policy "reviews insert own purchased"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = auth.uid()
        and o.status in ('paid', 'shipping', 'delivered')
        and oi.quantity > 0
    )
  );

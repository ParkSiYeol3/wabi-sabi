-- 0010: 재고 동시성 — 결제 확정 시점 원자적 재고 검증·차감 (#56)
-- 기존(0009)은 greatest(0, stock - qty) 클램프 차감 → 재고 1개에 두 주문이
-- 동시 결제되면 둘 다 paid 처리(초과판매)되고 재고만 0으로 눌려 감지 불가.
-- createPendingOrder 의 재고 체크는 SELECT 후 시간차(TOCTOU)라 강제력 없음.
--
-- 재작성 원칙:
--   ① 주문 행 FOR UPDATE — 동일 주문 동시 확정(성공페이지 새로고침·웹훅 경합) 직렬화
--   ② 상품 행 id 순 FOR UPDATE — 여러 주문이 같은 상품군을 엇갈려 잠글 때 교착 방지
--   ③ 잠금 하에 재고 검증 → 부족하면 주문 cancelled + 'out_of_stock' 반환
--      (서버가 토스 결제를 자동 취소·환불함 — payments.ts)
--   ④ 충분하면 정확히 차감 — 클램프 제거. products.stock 의 check(stock >= 0)가
--      최후 방어선(위반 시 예외 → 트랜잭션 롤백, 확정 실패)

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

  -- ② 이 주문이 건드리는 상품 행을 id 순으로 잠금
  perform 1
  from products p
  where p.id in (select product_id from order_items where order_id = p_order_id)
  order by p.id
  for update;

  -- ③ 잠금 하 재고 검증 — 하나라도 부족하면 확정 불가
  select count(*) into v_short
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = p_order_id and p.stock < oi.quantity;

  if v_short > 0 then
    update orders set status = 'cancelled' where id = p_order_id;
    return 'out_of_stock';
  end if;

  update orders set status = 'paid' where id = p_order_id;

  -- ④ 정확 차감 (검증 통과 후이므로 음수 불가)
  update products p
  set stock = p.stock - oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;

  return 'confirmed';
end;
$$;

-- 0009 와 동일: service_role 전용 (PUBLIC 기본 EXECUTE 회수)
revoke execute on function public.confirm_order_paid(uuid, int) from public, anon, authenticated;

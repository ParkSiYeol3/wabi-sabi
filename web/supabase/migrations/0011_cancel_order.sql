-- 0011: 주문 취소·환불 플로우 — 취소 RPC (#57)
-- 배송 전(paid) 주문 전액 취소: status cancelled + 재고 복원.
-- 순서 원칙(서버 lib/payments.cancelPaidOrder):
--   RPC(상태 잠금·취소·재고 복원) 먼저 → 토스 환불 나중.
--   환불을 먼저 하면 어드민 배송 처리와 경합 시 "배송됐는데 환불됨"이 가능 —
--   RPC 가 FOR UPDATE 잠금 하에 paid 임을 확인·전이하므로 그 경합이 봉쇄된다.
--   환불 실패 시엔 주문만 cancelled — 수동 환불 로그(고객 자금은 수동 처리로 보전).

create or replace function public.cancel_paid_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  -- 주문 잠금: 결제 확정(0010)·배송 처리와 직렬화
  select status into v_status
  from orders where id = p_order_id
  for update;

  if v_status is null then return 'not_found'; end if;
  if v_status = 'cancelled' then return 'already_cancelled'; end if; -- 멱등(환불 재시도 허용)
  if v_status <> 'paid' then return 'not_cancellable'; end if; -- shipping/delivered/pending 불가

  -- 상품 행 id 순 잠금(0010 과 동일 순서 → 교착 방지) 후 재고 복원
  perform 1
  from products p
  where p.id in (select product_id from order_items where order_id = p_order_id)
  order by p.id
  for update;

  update products p
  set stock = p.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;

  update orders set status = 'cancelled' where id = p_order_id;

  return 'cancelled';
end;
$$;

-- service_role 전용 (0009·0010 과 동일 — PUBLIC 기본 EXECUTE 회수)
revoke execute on function public.cancel_paid_order(uuid) from public, anon, authenticated;

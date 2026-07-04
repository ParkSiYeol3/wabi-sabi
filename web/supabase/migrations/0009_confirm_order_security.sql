-- 0009: 결제 확정 보안 강화
-- 기존 confirm_order 는 authenticated 가 직접 호출 가능 → 결제 없이 본인 pending 주문을
-- paid 로 전환 가능(재고 차감 포함). 실행 권한 회수 + 서버(service_role) 전용 함수로 교체.

-- ⚠ Postgres 함수는 생성 시 PUBLIC 에 EXECUTE 기본 부여 — authenticated 만 revoke 해도
-- PUBLIC 경유로 실행 가능. 구 함수는 더 이상 사용처가 없으므로 아예 제거한다.
drop function if exists public.confirm_order(uuid);

-- 서버 전용 확정: 금액 검증 + 멱등. service_role 만 호출(권한 부여 안 함).
create or replace function public.confirm_order_paid(p_order_id uuid, p_amount int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_status text;
  v_updated int;
begin
  select total_price, status into v_total, v_status
  from orders where id = p_order_id;

  if v_total is null then return 'not_found'; end if;
  if v_status = 'paid' then return 'already_paid'; end if; -- 멱등(새로고침/웹훅 중복)
  if v_total <> p_amount then return 'amount_mismatch'; end if;

  update orders set status = 'paid'
  where id = p_order_id and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then return 'not_pending'; end if;

  update products p
  set stock = greatest(0, p.stock - oi.quantity)
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;

  return 'confirmed';
end;
$$;

revoke execute on function public.confirm_order_paid(uuid, int) from public, anon, authenticated;

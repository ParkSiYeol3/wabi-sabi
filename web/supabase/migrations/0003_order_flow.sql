-- 주문 생성/결제 확정 흐름 (WSB-014~019)

-- order_items / gift_options insert 정책 (소속 주문이 본인 것일 때)
create policy "own order_items insert"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

create policy "own gift_options insert"
  on public.gift_options for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

-- 결제 확정: pending → paid + 재고 차감 (소유자만, 멱등)
-- ⚠️ 운영에선 토스 웹훅/서버 시크릿 검증 후 호출해야 안전. 여기선 success 라우트가
--    토스 confirm API 성공을 확인한 뒤 호출함.
create or replace function public.confirm_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_updated int;
begin
  select user_id into v_uid from orders where id = p_order_id;
  if v_uid is null or v_uid <> auth.uid() then
    raise exception 'not allowed';
  end if;

  update orders set status = 'paid'
  where id = p_order_id and status = 'pending';
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    update products p
    set stock = greatest(0, p.stock - oi.quantity)
    from order_items oi
    where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;
end;
$$;

grant execute on function public.confirm_order(uuid) to authenticated;

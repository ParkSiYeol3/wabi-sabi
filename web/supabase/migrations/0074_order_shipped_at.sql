-- 0074: 발송 시각 (#778)
-- 배송완료는 관리자가 눌러야만 바뀐다(#124). 누락을 알리려면 "발송 후 며칠 지났나"를
-- 알아야 하는데 송장을 처음 넣은 시각이 어디에도 없었다(감사로그에만). 송장을 처음
-- 저장할 때 기록하고, 송장을 지우면(배송 중 해제) 비운다. 번호 정정은 시각을 유지한다.

alter table public.orders add column if not exists shipped_at timestamptz;

-- 기존 배송 중·완료 주문: 감사로그의 첫 송장 저장 시각으로 채운다.
update public.orders o
set shipped_at = l.first_at
from (
  select target_id, min(created_at) as first_at
  from public.admin_audit_log
  where action = 'order.set_tracking'
  group by target_id
) l
where l.target_id = o.id::text
  and o.tracking_number is not null
  and o.shipped_at is null;

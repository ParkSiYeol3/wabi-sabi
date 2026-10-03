-- 0075: 발송 시각을 DB 트리거로 (#778 리뷰 반영)
-- 0074 는 앱(setTracking)이 "저장 전 송장"을 따로 조회해 처음 입력인지 판단했다. 그 조회가
-- 실패하거나 같은 주문에 요청이 겹치면 정정인데도 시각을 덮어쓰거나, 배송 중인데 시각이
-- 비는 일이 생길 수 있다. 같은 UPDATE 안에서 이전 값(old)을 보고 정하는 트리거로 옮긴다.
--   송장 지움      → shipped_at null
--   없던 송장 입력 → 지금 시각
--   번호·택배사 정정 → 그대로(이미 발송된 것)

create or replace function public.orders_set_shipped_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tracking_number is null then
    new.shipped_at := null;
  elsif old.tracking_number is null then
    new.shipped_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_shipped_at on public.orders;
create trigger orders_shipped_at
  before update of tracking_number on public.orders
  for each row execute function public.orders_set_shipped_at();

-- 0074 백필 보정: 주문의 "첫" 송장 기록이 아니라 "현재 송장이 시작된" 기록으로.
-- 마지막으로 송장을 지운 기록(meta.tracking_number = null) 이후, 송장이 있는 첫 기록.
update public.orders o
set shipped_at = x.started_at
from (
  select l.target_id, min(l.created_at) as started_at
  from public.admin_audit_log l
  where l.action = 'order.set_tracking'
    and l.meta ->> 'tracking_number' is not null
    and l.created_at > coalesce((
      select max(c.created_at)
      from public.admin_audit_log c
      where c.action = 'order.set_tracking'
        and c.target_id = l.target_id
        and c.meta ->> 'tracking_number' is null
    ), '-infinity'::timestamptz)
  group by l.target_id
) x
where x.target_id = o.id::text
  and o.tracking_number is not null;

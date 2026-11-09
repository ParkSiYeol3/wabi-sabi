-- 0086 리뷰 요청 메일 한 번만 (시열님 2026-11-08, 이슈 #919).
--
-- 배송완료 3일 뒤 마케팅 수신에 동의한 회원에게 리뷰 요청 메일을 한 통 보낸다
-- (/api/cron/review-reminders). 크론이 주문을 처리하면 이 칸에 시각을 남겨 다시 보내지
-- 않는다. 보내기 전에 먼저 채워 겹쳐 도는 실행이 같은 주문을 두 번 잡지 않게 하고, 발송이
-- 실패하면 비워서 다음 날 다시 시도한다.

alter table public.orders
  add column if not exists review_reminder_at timestamptz;

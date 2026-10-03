-- 0076: 비회원 주문 이메일(선택) (#787)
-- 비회원 주문은 이메일을 받지 않아 주문·발송·취소·배송완료 안내가 한 통도 가지 않았다.
-- 결제 화면에서 선택으로 받는다. 회원 주문은 계정 이메일을 쓰므로 비워 둔다.
-- 개인정보처리방침 개정(시행 2026-10-12) 전에는 앱이 이 칸을 받지 않는다.

alter table public.orders add column if not exists guest_email text;

alter table public.orders drop constraint if exists orders_guest_email_check;
alter table public.orders add constraint orders_guest_email_check
  check (guest_email is null or (char_length(guest_email) <= 254 and guest_email like '%_@_%._%'));

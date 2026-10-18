-- 0082 주문 결제 수단 표시(대표님 2026-10-18) — 주문 관리에서 결제 방법·쿠폰을 한 번에.
--
-- 결제 수단은 토스에만 있고 주문에 저장하지 않았다. 결제 확정 때 토스 응답(method·
-- easyPay.provider·card.cardType·할부)에서 만든 짧은 표시 문구를 저장한다
-- (lib/payments paymentLabel, 예: "카카오페이", "카드(신용) · 3개월 할부").
-- 이미 있는 주문은 관리자 주문 화면이 처음 열릴 때 토스 조회로 한 번 채운다.
-- 쿠폰은 coupon_id·discount 가 이미 있어 화면에서 coupons.code 를 붙이기만 한다.
--
-- 표시용 텍스트일 뿐이라 기존 주문 읽기 정책(본인·관리자)을 그대로 따른다. 쓰기는
-- 서버(service_role)만. 기본값 null 이라 적용 직후 변화 없음.

alter table public.orders
  add column if not exists payment_method text
    check (payment_method is null or char_length(payment_method) <= 60);

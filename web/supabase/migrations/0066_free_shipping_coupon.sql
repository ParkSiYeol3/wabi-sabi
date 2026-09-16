-- 0066: 무료배송 쿠폰 (대표님 #680).
--
-- 대표님이 어드민에서 만든 'WELCOME2026 첫구매 무료배송 쿠폰' 은 정액 3,500원 할인으로
-- 들어가 있었다. 배송비 정책이 "10만원 이상 무료 / 미만 3,500원"(lib/shipping)이라
-- 정액 할인으로 흉내 내면 두 군데가 어긋난다:
--   · 10만원 이상 주문 — 배송비가 이미 0인데 상품값에서 3,500원이 또 깎인다
--   · 배송비가 오르면 쿠폰 금액을 손으로 따라 고쳐야 한다
-- 그래서 "배송비를 0으로" 라는 뜻을 유형으로 만든다.
--
-- discount_value 는 free_shipping 에선 쓰이지 않는다(할인액 = 그 주문의 배송비).
-- 다만 0059 의 체크 제약이 discount_value > 0 이라 기존 값을 그대로 둔다.

alter table public.coupons
  drop constraint if exists coupons_discount_type_check;

alter table public.coupons
  add constraint coupons_discount_type_check
  check (discount_type in ('fixed', 'percent', 'free_shipping'));

-- 대표님이 만든 쿠폰을 의도대로 전환. 최소주문 등 나머지 조건은 대표님이 정한 값 그대로 둔다.
update public.coupons
   set discount_type = 'free_shipping',
       max_discount = null
 where code = 'WELCOME2026'
   and discount_type = 'fixed';

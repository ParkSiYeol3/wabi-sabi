-- 0020: 배송완료 수령일 기록 (#124)
--
-- 어드민은 송장 입력으로 paid → shipping 까지만 바꿀 수 있었다. delivered 로 가는
-- 경로가 없어 모든 주문이 영구히 "배송 중"에 머문다.
--
-- 수령일이 필요한 이유는 표시용만이 아니다 — 교환·환불 안내(#106)가 "상품을 수령한
-- 날부터 7일 이내 청약철회"라고 명시하는데, 수령일을 기록하지 않으면 그 기산점을
-- 알 수 없다. 분쟁 시 근거가 없다.

alter table public.orders
  add column delivered_at timestamptz;

-- 배송완료 주문 조회(수령일 기준 청약철회 기간 판단)용
create index orders_delivered_at_idx
  on public.orders (delivered_at desc)
  where delivered_at is not null;

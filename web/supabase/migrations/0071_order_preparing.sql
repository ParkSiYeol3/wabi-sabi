-- 0071: 상품 준비 중 (대표님 2026-10-02 — 첫 실주문).
--
-- 결제 완료(paid) 뒤 대표님이 그릇을 포장하기 시작하면 손님이 마이페이지에서 취소하지
-- 못하게 막아야 한다. 새 status 값을 만들면 매출·통계·리뷰 자격 등 10여 개 RPC 의
-- `status in ('paid','shipping','delivered')` 를 전부 고쳐야 하므로, status 는 paid 로
-- 두고 "준비 시작 시각"만 기록한다. 화면은 paid + preparing_at 을 "상품 준비 중"으로 보인다.
-- 손님 취소 경로(cancelMyOrder)가 이 값을 보고 거부한다. 관리자 취소는 그대로 가능.

alter table public.orders
  add column if not exists preparing_at timestamptz;

-- 0061: 옵션 값별 가격 (대표님 — 사이즈 M / L 처럼 값마다 금액이 다름)
--
-- 0058 이 값별 재고를 도입했다(products.stock_option = 변형 그룹, 그 그룹의 값마다
-- product_option_stock 1행). 가격도 같은 축에 얹는다 — 재고 그룹 = 가격 그룹(대표님
-- 확인). 색상×사이즈 같은 조합 관리는 범위 밖(조합별 재고 문제로 복잡해짐).
--
--   · price null  = 기본가(products.price) 사용
--   · price 있음  = 그 값의 판매가
--
-- products.price 는 관리 상품에선 '값별 가격의 최저가'로 유지한다(0058 의 stock=합과
-- 같은 패턴). 목록 카드가 '20,000원~' 처럼 최저가 기준으로 정확히 보이고, 기존
-- products.price 소비처(카드·검색·정렬·구조화 데이터)가 그대로 동작한다.
--
-- 결제 금액 안전성: 서버(checkout/actions)가 선택 값의 가격으로 subtotal 을 재계산해
-- orders.total_price 에 담고, confirm_order_paid 가 결제 승인액과 그 total 을 대조한다.
-- 즉 금액 검증 경로는 이미 서버 계산값 기준이라 RPC 변경이 필요 없다(재고와 다른 점).

alter table public.product_option_stock
  add column if not exists price int
  check (price is null or price >= 0);

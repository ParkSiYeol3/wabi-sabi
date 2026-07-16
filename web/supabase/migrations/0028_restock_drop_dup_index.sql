-- 0028: 재입고 구독 중복 인덱스 제거 (#167 리뷰 반영)
--
-- 0027 의 unique(product_id, user_id) 제약이 product_id 를 선행 컬럼으로 하는 복합
-- B-tree 인덱스를 이미 만든다. 상품별 구독자 조회(발송 시)는 그 인덱스로 커버되므로
-- product_id 단일 인덱스는 중복이다 — 저장 공간만 쓰고 insert/delete 를 느리게 한다.

drop index if exists public.restock_subscriptions_product_idx;

-- 0016: cart_items.product_id 인덱스 (#85 리뷰)
-- 0015 는 user_id 인덱스만 뒀다. product_id 는 FK(on delete cascade)라
-- 상품 삭제 시 cart_items 풀스캔이 발생하고, products 조인에도 활용된다.
create index if not exists cart_items_product_idx
  on public.cart_items (product_id);

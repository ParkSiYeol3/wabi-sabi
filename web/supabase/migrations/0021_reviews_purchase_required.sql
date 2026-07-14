-- 0021: 리뷰는 구매자만 (#126)
--
-- 0007 의 insert 정책은 `auth.uid() = user_id` 만 확인한다. 즉 로그인만 하면
-- 사지 않은 상품에도 리뷰를 쓸 수 있다. 서버 액션에 구매 검증을 넣어도 소용없다 —
-- 사용자는 PostgREST 로 reviews 에 직접 insert 할 수 있기 때문이다.
-- (실측: 미구매 계정 JWT 로 POST /rest/v1/reviews → 201 생성됨.)
--
-- 별점은 상품 페이지에 평균으로 노출되므로 가짜 리뷰는 곧바로 판매에 영향을 준다.
-- 애플리케이션이 아니라 DB 에서 막는다.
--
-- 인정 범위: 결제된 주문(paid·shipping·delivered)에 그 상품이 포함된 경우.
-- pending(미결제)·cancelled 는 제외 — 주문만 만들고 결제 없이 리뷰를 다는 우회 차단.

drop policy if exists "reviews insert own" on public.reviews;

create policy "reviews insert own purchased"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = auth.uid()
        and o.status in ('paid', 'shipping', 'delivered')
    )
  );

-- 구매 검증 조회(order_items.product_id → orders 조인)가 매 insert 마다 돈다.
create index if not exists order_items_product_idx
  on public.order_items (product_id);

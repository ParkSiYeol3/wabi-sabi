-- 0064: 장바구니 줄을 "상품"이 아니라 "상품+옵션 조합"으로 구분한다 (대표님 제보, #677).
--
-- 증상: 블랙 1개·라임 1개를 담으면 장바구니에 "라임 2개"로 표시됐다.
-- 원인: 줄을 product_id 하나로만 구분했다. 0015 의 unique(user_id, product_id) 때문에
-- 같은 상품은 옵션이 달라도 한 행으로 합쳐지고, 나중에 담은 옵션이 앞의 옵션을 덮었다.
--
-- line_key = 상품 id + 고른 옵션 + 추가옵션(애드온) 조합 문자열(lib/cart-line.ts 가
-- 만든다. 클라이언트와 서버가 같은 규칙을 쓰도록 한 곳에서만 만든다).
-- 기존 행은 옵션 구분이 없던 시절이라 product_id 를 그대로 키로 채운다(내용 동일).

alter table public.cart_items
  add column if not exists line_key text;

update public.cart_items
   set line_key = product_id::text
 where line_key is null;

alter table public.cart_items
  alter column line_key set not null;

-- 상품 단위 유니크를 줄 단위 유니크로 교체. 이름은 0015 의 기본 생성 이름.
alter table public.cart_items
  drop constraint if exists cart_items_user_id_product_id_key;

create unique index if not exists cart_items_user_line_key_idx
  on public.cart_items (user_id, line_key);

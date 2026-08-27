-- 상품 강제 품절 플래그(대표님) — 공개/비공개(is_active)와 별개로, 저장된 재고 수량과
-- 무관하게 손님에게 '품절(Out of Stock)'로 표시한다. 재고 개수를 0으로 바꾸지 않고도
-- 품절 처리할 수 있어, 재고 데이터를 보존한 채 판매만 잠글 수 있다.
--
-- 상품 상태 3종(대표님 3버튼):
--   · 공개   = is_active=true,  sold_out=false
--   · 비공개 = is_active=false            (손님 화면·검색·구매 전면 차단, RLS)
--   · 품절   = is_active=true,  sold_out=true  (노출은 하되 구매 불가·Out of Stock)
--
-- 손님 노출 판단은 애플리케이션에서 (stock<=0 OR sold_out) 으로 계산한다. 이 컬럼은
-- 품절 여부(불리언)일 뿐 재고 수량이 아니므로 공개돼도 무방(기존에도 Out of Stock 은
-- 노출됨). is_active RLS 정책은 그대로라 비공개 차단은 변함없다.

alter table public.products
  add column if not exists sold_out boolean not null default false;

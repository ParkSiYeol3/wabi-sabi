-- 0048: 상품별 커스텀 옵션 + 추가옵션 개별 노출 토글 (대표님 — 상품마다 색상·모양 등
-- 선택지가 달라 미리 정의 불가. 등록 시 직접 입력, 상세에서 손님이 선택. 선택값은
-- 주문에 스냅샷돼 대표님이 어떤 색을 보낼지 안다. 옵션은 선택만 — 가격·재고 영향 없음.)
--
--   products.options        = [{name, values:[...]}, ...]   대표님이 정의한 옵션 그룹
--   products.enabled_addons = ["gift_wrap", ...]            상세에 노출할 추가옵션 코드
--   cart_items.options      = [{name, value}, ...]          장바구니 라인이 고른 옵션
--   order_items.options     = [{name, value}, ...]          주문 시점 스냅샷
--
-- 추가옵션(선물 포장·쇼핑백) 정가·목록은 addons.ts 가 진실 — enabled_addons 는 그중
-- 어떤 걸 이 상품 상세에 보일지만 고른다. 기존 상품은 둘 다 노출(현행 동작 보존).

alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists enabled_addons jsonb not null
    default '["gift_wrap","shopping_bag"]'::jsonb;

alter table public.cart_items
  add column if not exists options jsonb not null default '[]'::jsonb;

alter table public.order_items
  add column if not exists options jsonb not null default '[]'::jsonb;

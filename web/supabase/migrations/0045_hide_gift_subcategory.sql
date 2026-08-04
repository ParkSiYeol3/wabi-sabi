-- 선물(gift) 소분류 숨김 (95단계 후속) — GIFT 대분류 페이지(/gift)를 신설하면서
-- OBJECTS 아래 "선물" 소분류가 중복돼 사이드바에서 제거한다(대표님).
-- 삭제가 아니라 is_active=false(숨김) — 되돌릴 수 있고, 소분류에 속한 상품은
-- getCategorySlugs 가 숨김 분류도 확장하므로 OBJECTS 필터엔 계속 노출된다(상품 손실 없음).
-- 대표님이 admin 에서 해당 상품(예: 찻잔 세트)을 알맞은 소분류(다기 등)로 옮기면 된다.
update public.categories
set is_active = false
where slug = 'gift' and parent_id is not null;

-- 0036: 카테고리 추가·숨김 (대표님 지시 — 어드민에서 분류 추가/제외)
--
-- 지금까지 트리 구조·slug 는 코드(categoryTree)가 소유했으나, 대표님이
-- 어드민에서 직접 분류를 추가/제외할 수 있어야 해 DB 를 구조의 진실로
-- 승격한다(getCategoryTree 가 DB 로 트리를 만들고 코드 트리는 폴백).
--
-- is_active = 노출 여부. "제외"는 삭제가 아니라 숨김이 기본 — 상품 연결을
-- 보존한다(숨긴 분류의 상품은 전체 목록에는 계속 나온다). 삭제는 하위·상품이
-- 없는 빈 분류만 허용(애플리케이션에서 가드).

alter table public.categories
  add column if not exists is_active boolean not null default true;

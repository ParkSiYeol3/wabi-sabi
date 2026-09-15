-- 0062: 오늘의 와비사비 — 글에 쓰인 상품 태그(대표님, #664).
--
-- 손님이 올린 사진 속 기물이 어떤 상품인지 태그로 보여주고, 누르면 상품 상세로
-- 간다. 글 작성자가 고르고, 관리자가 나중에 고칠 수 있다.
--
-- 별도 연결 테이블 대신 uuid 배열 한 칸: 글과 함께 한 번에 insert 되므로 기존 RLS
-- (insert own) 가 그대로 덮고, 새 정책이 필요 없다. FK 가 없으니 지워지거나 내린
-- 상품 id 가 남을 수 있는데, 조회 쪽이 products(공개 RLS = is_active) 로 풀어 보이는
-- 것만 태그로 그린다.
--
-- ⚠ 공개 목록 select 에 product_ids 가 들어가므로 이 마이그레이션을 프로덕션에 먼저
-- 적용한 뒤 배포한다(0057 교훈). 기존 코드는 이 컬럼을 모르므로 먼저 적용해도 안전.

alter table public.wabi_moments
  add column if not exists product_ids uuid[] not null default '{}';

-- 작성자가 Data API 로 직접 insert 해도 태그를 무한히 붙이지 못하게 DB 에서 막는다
-- (서버 액션도 5개로 자르지만, RLS insert own 경로는 액션을 거치지 않을 수 있다).
alter table public.wabi_moments
  drop constraint if exists wabi_moments_product_ids_max;
alter table public.wabi_moments
  add constraint wabi_moments_product_ids_max
  check (cardinality(product_ids) <= 5);

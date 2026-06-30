-- 0004: Shop 카테고리 재구성 + 이 달의 상품(monthly) 플래그
-- 형님 피드백(KakaoTalk) 반영:
--   Shop 소분류 = All / monthly / Plate / Bowl / Cup / Cutlery / Life / Gift / Craft
-- 모델링: 물건 종류 7개(category_id) + monthly(is_monthly 플래그). All = 필터 없음.
--   monthly 는 종류와 직교(접시면서 이달의 상품 가능) → 별도 컬럼으로 둔다.

-- ── products: 이 달의 상품 플래그 ──────────────────────────
alter table public.products
  add column if not exists is_monthly boolean not null default false;

create index if not exists products_is_monthly_idx
  on public.products (is_monthly)
  where is_monthly;

-- ── categories: 7개 종류로 재구성 ──────────────────────────
-- 신규 7종 upsert (craft 는 기존 유지, 나머지는 신규/교체)
insert into public.categories (slug, name_ko, name_en, sort_order) values
  ('plate',    '접시',      'Plate',    1),
  ('bowl',     '볼',        'Bowl',     2),
  ('cup',      '컵',        'Cup',      3),
  ('cutlery',  '커트러리',  'Cutlery',  4),
  ('life',     '리빙',      'Life',     5),
  ('gift',     '선물',      'Gift',     6),
  ('craft',    '공예',      'Craft',    7)
on conflict (slug) do update
  set name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      sort_order = excluded.sort_order;

-- 구 카테고리 제거 (products.category_id 는 on delete set null)
delete from public.categories
  where slug in ('tableware', 'objects', 'gifts');

-- 카테고리 시드 — Shop 물건 종류 7종 (형님 피드백 IA)
-- All=전체보기, monthly=이 달의 상품(products.is_monthly)은 카테고리 아님.
insert into public.categories (slug, name_ko, name_en, sort_order) values
  ('plate',   '접시',     'Plate',   1),
  ('bowl',    '볼',       'Bowl',    2),
  ('cup',     '컵',       'Cup',     3),
  ('cutlery', '커트러리', 'Cutlery', 4),
  ('life',    '리빙',     'Life',    5),
  ('gift',    '선물',     'Gift',    6),
  ('craft',   '공예',     'Craft',   7)
on conflict (slug) do update
  set name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      sort_order = excluded.sort_order;

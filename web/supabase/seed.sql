-- 카테고리 시드 (브리핑 IA)
insert into public.categories (slug, name_ko, name_en, sort_order) values
  ('tableware', '식기',   'Tableware', 1),
  ('objects',   '오브제', 'Objects',   2),
  ('craft',     '공예',   'Craft',     3),
  ('gifts',     '선물',   'Gifts',     4)
on conflict (slug) do nothing;

-- 샘플 상품 시드 (개발용) — 실제 상품으로 교체 예정
-- category_id 는 slug 로 조회. 이미지는 추후 Storage URL 로 교체.
-- is_monthly = 이 달의 상품(Shop monthly 탭). 종류와 직교 → 접시/볼이면서 동시에 가능.
insert into public.products (category_id, name, slug, price, stock, description, material, is_monthly, is_active)
select c.id, v.name, v.slug, v.price, v.stock, v.description, v.material, v.is_monthly, true
from (values
  ('bowl',    '세라믹 볼',    'ceramic-bowl',   86000, 12, '시간의 흔적이 담긴 수공예 세라믹 볼.', '도자기',     true),
  ('bowl',    '백자 볼 세트', 'white-bowl-set', 62000, 8,  '담백한 백자 볼 2P 세트.',          '백자',       false),
  ('cup',     '다기 세트',    'tea-set',        95000, 5,  '차를 위한 다기 한 벌.',            '도자기',     true),
  ('life',    '백자 화병',    'white-vase',     45000, 10, '단순한 형태의 백자 화병.',          '백자',       false),
  ('life',    '오브제 화병',  'object-vase',    52000, 6,  '공간에 여백을 더하는 오브제.',       '도자기',     false),
  ('cutlery', '도자기 스푼',  'ceramic-spoon',  18000, 30, '손으로 빚은 도자기 스푼.',          '도자기',     false),
  ('cutlery', '수저 세트',    'cutlery-set',    38000, 15, '나무 손잡이 수저 세트.',            '도자기/목재', false),
  ('gift',    '찻잔 세트',    'cup-gift-set',   71000, 9,  '선물용 찻잔 세트(포장 가능).',       '백자',       true)
) as v(cat_slug, name, slug, price, stock, description, material, is_monthly)
join public.categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;

-- 0032: 카테고리 2계층(대분류 > 소분류) 개편 (#193, 대표님 피드백)
--
-- 그릇·컵 외에 다도 도구·부채·키링·목걸이·팔찌·머리끈 등 상품군이 넓어져 단일 7종으론
-- 부족하다. biomedium.kr 식 좌측 사이드바 소분류 토글의 데이터 기반.
--
-- 구조: categories.parent_id (self FK). 대분류는 parent_id null, 소분류는 대분류를
-- 가리킨다. 상품은 소분류(잎)에 연결한다 — 예외로 '선물'은 하위 없는 단독 대분류라
-- 상품이 직접 연결된다. 대분류 필터는 애플리케이션에서 하위 slug 목록으로 확장한다.
-- sort_order 는 대분류 10·20·…, 그 하위는 11·12·… 블록 번호로 전역 정렬을 겸한다.

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;

create index if not exists categories_parent_id_idx
  on public.categories (parent_id);

-- ── 대분류 ──────────────────────────────────────────────
insert into public.categories (slug, name_ko, name_en, sort_order) values
  ('tableware', '식기',     'Tableware', 10),
  ('tea',       '다도',     'Tea',       20),
  ('accessory', '액세서리', 'Accessory', 30),
  ('living',    '리빙',     'Living',    40)
on conflict (slug) do update
  set name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      sort_order = excluded.sort_order;

-- ── 기존 7종을 소분류로 재배치 ──────────────────────────
-- 식기: 접시·볼·컵·커트러리
update public.categories set
  parent_id = (select id from public.categories where slug = 'tableware'),
  sort_order = case slug when 'plate' then 11 when 'bowl' then 12
                         when 'cup' then 13 else 14 end
where slug in ('plate', 'bowl', 'cup', 'cutlery');

-- 리빙: 생활 소품(life 라벨 변경 — slug·상품 연결은 유지)·공예
update public.categories set
  parent_id = (select id from public.categories where slug = 'living'),
  name_ko = '생활 소품',
  sort_order = 41
where slug = 'life';

update public.categories set
  parent_id = (select id from public.categories where slug = 'living'),
  sort_order = 42
where slug = 'craft';

-- 선물: 하위 없는 단독 대분류로 유지(연결된 상품 그대로)
update public.categories set parent_id = null, sort_order = 50
where slug = 'gift';

-- ── 신규 소분류 ────────────────────────────────────────
insert into public.categories (slug, name_ko, name_en, sort_order, parent_id) values
  ('teaware',  '다기',   'Teaware',  21, (select id from public.categories where slug = 'tea')),
  ('fan',      '부채',   'Fan',      22, (select id from public.categories where slug = 'tea')),
  ('keyring',  '키링',   'Keyring',  31, (select id from public.categories where slug = 'accessory')),
  ('necklace', '목걸이', 'Necklace', 32, (select id from public.categories where slug = 'accessory')),
  ('bracelet', '팔찌',   'Bracelet', 33, (select id from public.categories where slug = 'accessory')),
  ('hairtie',  '머리끈', 'Hair Tie', 34, (select id from public.categories where slug = 'accessory'))
on conflict (slug) do update
  set name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      sort_order = excluded.sort_order,
      parent_id = excluded.parent_id;

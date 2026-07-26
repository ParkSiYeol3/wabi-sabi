-- 0037: 카테고리 2대분류 재편 — TABLEWARE / OBJECTS (대표님 지시)
--
-- 상단 내비를 TABLEWARE | OBJECTS | SHOWROOM 으로 나눈다. 상품 분류는 그릇류 vs
-- 오브제/소품 두 갈래로:
--   TABLEWARE = 식기(접시·볼·컵·커트러리) + 다도(다기·부채)
--   OBJECTS   = 액세서리(키링·목걸이·팔찌·머리끈) + 리빙(생활소품·공예) + 선물
-- 상품은 모두 잎(소분류)에 연결돼 있으므로(확인함) 부모만 갈아끼우면 안전하다.
-- 잎 slug 는 그대로라 상품 FK·URL 불변. 대분류 이름은 영문 대문자로 노출한다.

-- 1) 대분류: tableware 를 TABLEWARE 로, objects 신설.
update public.categories
  set name_ko = 'TABLEWARE', name_en = 'Tableware', sort_order = 10, parent_id = null
  where slug = 'tableware';

insert into public.categories (slug, name_ko, name_en, sort_order, parent_id, is_active)
  values ('objects', 'OBJECTS', 'Objects', 20, null, true)
  on conflict (slug) do update
    set name_ko = excluded.name_ko,
        name_en = excluded.name_en,
        sort_order = excluded.sort_order,
        parent_id = null,
        is_active = true;

-- 2) 소분류 재배치 (parent_id + 정렬 블록).
--    TABLEWARE 잎: 접시·볼·컵·커트러리(기존) + 다기·부채(다도에서 이동).
update public.categories set parent_id = (select id from public.categories where slug = 'tableware'), sort_order = 11 where slug = 'plate';
update public.categories set parent_id = (select id from public.categories where slug = 'tableware'), sort_order = 12 where slug = 'bowl';
update public.categories set parent_id = (select id from public.categories where slug = 'tableware'), sort_order = 13 where slug = 'cup';
update public.categories set parent_id = (select id from public.categories where slug = 'tableware'), sort_order = 14 where slug = 'cutlery';
update public.categories set parent_id = (select id from public.categories where slug = 'tableware'), sort_order = 15 where slug = 'teaware';
update public.categories set parent_id = (select id from public.categories where slug = 'tableware'), sort_order = 16 where slug = 'fan';

--    OBJECTS 잎: 액세서리·리빙 소분류 + 선물.
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 21 where slug = 'keyring';
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 22 where slug = 'necklace';
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 23 where slug = 'bracelet';
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 24 where slug = 'hairtie';
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 25 where slug = 'life';
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 26 where slug = 'craft';
update public.categories set parent_id = (select id from public.categories where slug = 'objects'), sort_order = 27 where slug = 'gift';

-- 3) 빈 대분류 삭제 — 자식은 위에서 옮겼고 상품은 잎에만 연결(직접 연결 없음).
delete from public.categories where slug in ('tea', 'accessory', 'living');

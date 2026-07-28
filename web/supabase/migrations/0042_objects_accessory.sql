-- 0042: OBJECTS 소분류 통합 — 키링·목걸이·팔찌·머리끈 → "액세서리" 하나 (대표님).
--
-- 액세서리류를 개별 소분류로 나누지 않고 하나로 묶는다. 해당 4개 잎엔 연결된
-- 상품이 없음을 확인했으므로 재지정은 불필요. keyring 행을 accessory 로 개명하고
-- (기존 sort_order 유지 → OBJECTS 소분류 맨 앞) 나머지 셋은 삭제한다.
update public.categories
  set slug = 'accessory', name_ko = '액세서리', name_en = 'Accessory'
  where slug = 'keyring';

delete from public.categories
  where slug in ('necklace', 'bracelet', 'hairtie');

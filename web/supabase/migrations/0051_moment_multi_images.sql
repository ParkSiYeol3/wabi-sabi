-- 오늘의 와비사비 다중 사진(인스타그램 피드식 · 대표님).
-- 기존 단일 image_url 은 커버(첫 장)로 그대로 유지한다 — 그리드 썸네일·OG·관리자
-- 모더레이션이 image_url 을 참조하므로 호환을 위해 계속 채운다. 전체 사진 목록은
-- image_urls(text[]) 에 순서대로 담는다(커버가 첫 원소).
alter table public.wabi_moments
  add column if not exists image_urls text[];

-- 기존 행 백필 — 단일 사진을 1장짜리 배열로 채워, 조회에서 image_urls 를 단일 출처로 쓸 수 있게.
update public.wabi_moments
  set image_urls = array[image_url]
  where image_urls is null;

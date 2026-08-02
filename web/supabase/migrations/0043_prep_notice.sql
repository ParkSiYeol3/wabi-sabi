-- 0043: 정식 오픈 준비중 안내(대표님)
--
-- 토스 라이브 심사·실상품·가격 확정 전, 손님이 결제를 시도했다 실패하지 않도록
-- 사이트 진입 시 안내 모달을 띄운다. site_content(prep_notice) 값이 "on" 이면 표시.
-- 대표님이 어드민(사이트 콘텐츠)에서 켜고/끈다. 배포 직후 곧바로 켜져 있도록 시드.
-- 안내 문구(prep_notice_text)는 미저장 시 앱이 기본 문구로 폴백하므로 시드하지 않는다.
-- 이미 값이 있으면(대표님이 조작한 뒤) 덮어쓰지 않는다.

insert into public.site_content (key, value)
values ('prep_notice', 'on')
on conflict (key) do nothing;

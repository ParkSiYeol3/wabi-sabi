-- 0040: 닉네임 설정 플래그 (개인정보보호 — 대표님/시열님).
--
-- 소셜 로그인/회원가입 직후 실명(소셜 프로필 이름)이 그대로 노출되면 부담스럽다.
-- 가입 후 닉네임을 한 번 정하도록 모달을 띄우기 위한 플래그. false 인 동안만 모달을
-- 강제하고, 닉네임을 저장하면 true 로 바꿔 다시 뜨지 않게 한다.
--
-- 기존 사용자는 이미 이름이 자리잡았으므로 backfill 로 true(모달 면제). 신규 가입은
-- handle_new_user 트리거가 nickname_set 를 지정하지 않아 컬럼 기본값 false → 모달 노출.

alter table public.profiles
  add column nickname_set boolean not null default false;

-- 기존 회원은 모달 면제(이미 표시 이름 존재).
update public.profiles set nickname_set = true;

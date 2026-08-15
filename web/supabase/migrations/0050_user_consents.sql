-- 약관·개인정보·마케팅 동의 이력 (개인정보보호법 §15·§22 — 항목별 동의와 이력 보관).
-- 가입 시점의 동의 항목·버전·시각을 남겨, 이후 약관이 개정돼도 "무엇에 동의했는지"를
-- 감사 가능하게 한다. 기록(insert)은 트리거(security definer)와 서버 액션(service_role)만
-- 하고, 사용자는 자기 이력을 읽기만 한다.

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('terms', 'privacy', 'marketing')),
  version text not null,
  agreed boolean not null,
  agreed_at timestamptz not null default now()
);

create index if not exists user_consents_user_id_idx
  on public.user_consents(user_id);

alter table public.user_consents enable row level security;

-- 본인 동의 이력 조회만 허용. insert/update/delete 정책은 없음
-- → 트리거(security definer)·서버 액션(service_role)만 기록/변경 가능.
drop policy if exists "own consents read" on public.user_consents;
create policy "own consents read" on public.user_consents
  for select using (auth.uid() = user_id);

-- handle_new_user 확장 — profiles 생성에 더해, 이메일 가입 시 넘어온 동의 메타데이터를
-- 이력으로 남긴다. 소셜 가입은 provider 메타에 동의값이 없어(콜백에서 기록) 건너뛴다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  m jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, m ->> 'name');

  -- 약관·개인정보(필수)·마케팅(선택) 동의. 버전이 넘어온 이메일 가입에만 기록한다.
  if m ? 'consent_terms_version' then
    insert into public.user_consents (user_id, type, version, agreed)
    values
      (new.id, 'terms', m ->> 'consent_terms_version', true),
      (new.id, 'privacy',
        coalesce(m ->> 'consent_privacy_version', m ->> 'consent_terms_version'),
        true),
      (new.id, 'marketing',
        coalesce(m ->> 'consent_terms_version', ''),
        coalesce((m ->> 'consent_marketing')::boolean, false));
  end if;

  return new;
end;
$$;

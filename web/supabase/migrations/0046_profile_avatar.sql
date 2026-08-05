-- 0046: 표시용 아바타를 profiles 에 고정 — 소셜 provider 가 바뀌어도 아바타가
-- 흔들리지 않게(시열님). 같은 이메일의 여러 소셜이 한 계정으로 자동 연결
-- (Supabase identity linking)되면 헤더 아바타가 세션 메타(마지막 로그인 provider)를
-- 따라 바뀌었다. avatar_url 을 최초 가입 시 한 번 저장해 고정한다.
alter table public.profiles add column if not exists avatar_url text;

-- 트리거: 최초 생성 시 아바타도 저장(Google=avatar_url/picture, Kakao=avatar_url).
-- 이후 로그인/연결에선 트리거가 다시 안 돌아 값이 고정된다(=흔들림 방지).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

-- 기존 계정 백필 — 현재 auth.users 메타의 아바타를 한 번 고정한다.
update public.profiles p
set avatar_url = coalesce(
  u.raw_user_meta_data ->> 'avatar_url',
  u.raw_user_meta_data ->> 'picture'
)
from auth.users u
where u.id = p.id and p.avatar_url is null;

-- SELECT 는 기존 "본인 프로필" RLS 로 충분(헤더가 본인 avatar_url 만 읽음).
-- avatar_url 은 사용자가 바꾸지 않으므로 UPDATE grant 는 주지 않는다(권한 최소화).

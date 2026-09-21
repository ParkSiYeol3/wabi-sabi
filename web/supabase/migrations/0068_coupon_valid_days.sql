-- 0068: 발급 후 N일까지 쓰는 쿠폰 (대표님 2026-09-21 — 가입 축하 쿠폰은 발급 후 한 달).
--
-- 0059 의 만료(coupons.expires_at)는 쿠폰 **정의 전체**에 하나뿐이라 "10월 31일까지"
-- 같은 고정 기한만 표현된다. 가입 축하 쿠폰은 사람마다 받는 날이 다르므로,
-- 만료도 **그 사람이 받은 날**을 기준으로 따로 잡혀야 한다.
--
--   coupons.valid_days      쿠폰 정의에 붙는 규칙 — "발급 후 며칠" (null=상대 만료 없음)
--   user_coupons.expires_at 발급 순간 계산해 박아 두는 그 사람의 만료 시각
--
-- 발급 시점에 계산해 저장하는 이유: 나중에 대표님이 valid_days 를 바꿔도 **이미 받은
-- 사람의 기한은 움직이지 않는다.** 손님에게 한 번 알린 기한이 뒤늦게 당겨지면 안 된다.

alter table public.coupons
  add column if not exists valid_days int
    check (valid_days is null or valid_days > 0);

comment on column public.coupons.valid_days is
  '발급 후 유효일수. 지갑에 넣는 순간 user_coupons.expires_at 으로 굳는다(null=상대 만료 없음).';

alter table public.user_coupons
  add column if not exists expires_at timestamptz;

comment on column public.user_coupons.expires_at is
  '이 사람의 쿠폰 만료 시각. 발급 시 coupons.valid_days 로 계산해 고정(null=상대 만료 없음).';

-- 만료 시각 계산 — KST 로 "받은 날 + N일" 의 **그 날 끝**까지 쓰게 한다.
-- 시:분까지 정확히 재면 오전에 받은 사람은 마지막 날 오전에 끊겨 억울하다.
-- 그래서 다음 날 0시(KST)를 돌려주고, 판정은 now() < expires_at 으로 한다.
create or replace function public.coupon_wallet_expiry(
  p_issued timestamptz,
  p_valid_days int
)
returns timestamptz
language sql
immutable
as $$
  select case
    when p_valid_days is null then null
    else (
      ((p_issued at time zone 'Asia/Seoul')::date
        + p_valid_days + 1)::timestamp at time zone 'Asia/Seoul'
    )
  end;
$$;

-- 가입 자동 발급 — 넣는 순간 그 사람의 만료를 함께 박는다.
-- (0059 의 본체를 그대로 두고 쿠폰 부분만 바꾼다.)
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

  -- 가입 축하 쿠폰 등 자동 발급 대상 — 지갑에 넣는다(중복은 unique 로 무시).
  insert into public.user_coupons (user_id, coupon_id, expires_at)
  select new.id, c.id, public.coupon_wallet_expiry(now(), c.valid_days)
  from public.coupons c
  where c.auto_issue_signup and c.is_active
  on conflict (user_id, coupon_id) do nothing;

  return new;
end;
$$;

-- 대표님 가입 축하 쿠폰: 발급 후 한 달. 손님에게는 "발급 후 30일" 로 보인다.
update public.coupons
   set valid_days = 30
 where code = 'WELCOME2026'
   and valid_days is null;

-- 이미 지갑에 든 발급분 — 규칙이 생겼으니 받은 날 기준으로 채운다.
-- (현재 발급분 0건이라 대상이 없지만, 나중에 다시 적용해도 안전하도록 남긴다.)
update public.user_coupons uc
   set expires_at = public.coupon_wallet_expiry(uc.issued_at, c.valid_days)
  from public.coupons c
 where c.id = uc.coupon_id
   and c.valid_days is not null
   and uc.expires_at is null
   and uc.used_at is null;

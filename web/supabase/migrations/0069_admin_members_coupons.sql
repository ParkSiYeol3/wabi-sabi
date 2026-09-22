-- 0069: 회원 관리에 쿠폰 현황 (대표님 2026-09-22).
--
-- 가입 축하 쿠폰이 돌기 시작했는데(0066·0068), 회원 관리에서는 누가 받았고 누가
-- 썼는지 볼 수가 없었다. 0063 의 admin_members 에 세 값을 더한다.
--
--   coupon_unused      지금 쓸 수 있는 장수 (미사용 + 기한 안 지남)
--   coupon_next_expiry 그중 가장 먼저 끝나는 기한 — 화면에 "~10/21" 로 보여 준다
--   coupon_used        지금까지 쓴 장수
--
-- 기한은 **정의 기한과 지갑 기한 중 이른 쪽**이다(0068 effectiveExpiry 와 같은 규칙).
-- Postgres 의 least() 는 null 을 무시하므로 둘 중 하나만 있어도 그대로 골라진다.

create or replace function public.admin_members(p_limit int default 1000)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'id', m.id,
      'email', m.email,
      'name', m.name,
      'role', m.role,
      'providers', m.providers,
      'joined_at', m.created_at,
      'last_sign_in_at', m.last_sign_in_at,
      'email_confirmed', m.email_confirmed,
      'marketing', m.marketing,
      'orders', m.orders,
      'amount', m.amount,
      'coupon_unused', m.coupon_unused,
      'coupon_next_expiry', m.coupon_next_expiry,
      'coupon_used', m.coupon_used
    ) order by m.created_at desc
  ), '[]'::json)
  from (
    select
      u.id,
      u.email,
      p.name,
      coalesce(p.role, 'user') as role,
      -- 연결된 로그인 수단(email·kakao·google) — 소셜 연결(#481)도 여기 쌓인다.
      coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) as providers,
      u.created_at,
      u.last_sign_in_at,
      (u.email_confirmed_at is not null) as email_confirmed,
      -- 마케팅 동의는 이력 테이블(0050) — 가장 최근 기록. 기록 없으면 null.
      mk.agreed as marketing,
      coalesce(o.orders, 0) as orders,
      coalesce(o.amount, 0) as amount,
      coalesce(cp.unused, 0) as coupon_unused,
      cp.next_expiry as coupon_next_expiry,
      coalesce(cp.used, 0) as coupon_used
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join lateral (
      select c.agreed
        from public.user_consents c
       where c.user_id = u.id and c.type = 'marketing'
       order by c.agreed_at desc
       limit 1
    ) mk on true
    left join (
      select user_id,
             count(*)::int as orders,
             coalesce(sum(total_price), 0)::bigint as amount
        from public.orders
       where status in ('paid', 'shipping', 'delivered')
         and user_id is not null
       group by user_id
    ) o on o.user_id = u.id
    -- 지갑 현황. 기한이 지난 미사용분은 쓸 수 없으므로 unused 에서 뺀다.
    left join (
      select uc.user_id,
             count(*) filter (
               where uc.used_at is null
                 and (least(c.expires_at, uc.expires_at) is null
                      or least(c.expires_at, uc.expires_at) > now())
             )::int as unused,
             min(least(c.expires_at, uc.expires_at)) filter (
               where uc.used_at is null
                 and (least(c.expires_at, uc.expires_at) is null
                      or least(c.expires_at, uc.expires_at) > now())
             ) as next_expiry,
             count(*) filter (where uc.used_at is not null)::int as used
        from public.user_coupons uc
        join public.coupons c on c.id = uc.coupon_id
       where c.is_active
       group by uc.user_id
    ) cp on cp.user_id = u.id
    where u.deleted_at is null
    order by u.created_at desc
    limit greatest(p_limit, 1)
  ) m;
$$;

revoke execute on function public.admin_members(int) from public, anon, authenticated;
grant  execute on function public.admin_members(int) to service_role;

-- 0063: 어드민 회원 관리 — 가입 회원 목록(대표님, #665).
--
-- '구매자 관리'(0055 admin_customers)는 확정 주문이 있는 사람만 보인다. 가입만 하고
-- 아직 안 산 회원까지 전부 보려면 auth.users 가 출발점이어야 하는데, auth 스키마는
-- Data API 로 읽을 수 없다 → security definer RPC(service_role 전용)로 한 번에 집계.
-- 0055 관례대로 json_agg 단일 값(호출부 data as Row[] 캐스트), 1,000행 제한 회피.
--
-- 담는 것(운영에 필요한 최소): 닉네임·이메일·역할·가입 방법·가입일·최근 로그인·
-- 이메일 인증 여부·마케팅 수신 동의(최신 기록)·확정 주문 횟수/금액.
-- 담지 않는 것: 비밀번호 해시·토큰·원본 메타데이터 전체 등 인증 내부값.

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
      'amount', m.amount
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
      coalesce(o.amount, 0) as amount
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
    where u.deleted_at is null
    order by u.created_at desc
    limit greatest(p_limit, 1)
  ) m;
$$;

revoke execute on function public.admin_members(int) from public, anon, authenticated;
grant  execute on function public.admin_members(int) to service_role;

-- 0055: 어드민 분석 스위트 — 재고 관리(C)·구매자 관리(B) 집계 RPC(대표님).
-- Data API 1,000행 제한 회피(0024·0031·0052·0053 관례)로 DB 에서 집계한다.
-- json_agg 단일 값 반환(호출부는 data as Row[] 캐스트) — returns table 의 배열
-- 캐스트 타입 충돌을 피한다. 판매 집계는 '확정' 상태(결제완료·배송중·배송완료)만
-- 센다(취소·미결제 제외). security definer·service_role 전용.

-- ── C 재고 관리: 현재고 + 누적 판매수량·판매액(상품별) ──
-- 판매수량 = order_items.quantity 합(확정 주문). 판매액 = quantity*price(상품 항목
-- 기준, 배송비·애드온 제외). 재고 적은 순 → 많이 팔린 순.
create or replace function public.admin_inventory_status()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'product_id', p.id,
      'name', p.name,
      'stock', p.stock,
      'is_active', p.is_active,
      'sold', coalesce(s.sold, 0),
      'revenue', coalesce(s.revenue, 0)
    ) order by p.stock asc, coalesce(s.sold, 0) desc
  ), '[]'::json)
  from products p
  left join (
    select oi.product_id,
           sum(oi.quantity)::bigint as sold,
           sum(oi.quantity * oi.price)::bigint as revenue
      from order_items oi
      join orders o on o.id = oi.order_id
     where o.status in ('paid', 'shipping', 'delivered')
     group by oi.product_id
  ) s on s.product_id = p.id;
$$;

revoke execute on function public.admin_inventory_status() from public, anon, authenticated;
grant  execute on function public.admin_inventory_status() to service_role;

-- ── B 구매자 관리: 구매자별 구매 횟수·금액 ──
-- 회원은 user_id 로, 비회원은 전화번호로 묶는다. 금액은 total_price(결제액) 합.
-- 회원 라벨=닉네임(profiles.name)→이메일→'회원', 비회원 라벨=수령인. 금액 큰 순.
create or replace function public.admin_customers(p_limit int default 100)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'label', case when g.is_member
                    then coalesce(g.pname, g.pemail, '회원')
                    else g.recipient end,
      'contact', case when g.is_member then g.pemail else g.phone end,
      'is_member', g.is_member,
      'orders', g.orders,
      'amount', g.amount,
      'last_ordered', g.last_ordered
    ) order by g.amount desc
  ), '[]'::json)
  from (
    select
      coalesce(o.user_id::text, 'guest:' || o.phone) as k,
      (o.user_id is not null) as is_member,
      max(pr.name)  as pname,
      max(pr.email) as pemail,
      max(o.recipient) as recipient,
      max(o.phone)     as phone,
      count(*)::int as orders,
      coalesce(sum(o.total_price), 0)::bigint as amount,
      max(o.ordered_at) as last_ordered
    from orders o
    left join profiles pr on pr.id = o.user_id
    where o.status in ('paid', 'shipping', 'delivered')
    group by coalesce(o.user_id::text, 'guest:' || o.phone), (o.user_id is not null)
    order by amount desc
    limit greatest(p_limit, 1)
  ) g;
$$;

revoke execute on function public.admin_customers(int) from public, anon, authenticated;
grant  execute on function public.admin_customers(int) to service_role;

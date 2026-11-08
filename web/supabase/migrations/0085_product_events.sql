-- 0085 상품 상세 버튼 기록 (시열님 2026-11-08, "상품 보고 안 담는 이유 찾기").
--
-- 주당 상품 상세 방문자는 50명 남짓인데 장바구니까지 오는 사람은 1~4명이다. 방문 기록
-- (page_views)은 주소만 남아서 담기를 눌렀는지, 눌렀는데 막혔는지 알 수 없다.
--
--   add          장바구니 담기 성공
--   buy          바로 구매 성공(장바구니로 이동)
--   need_option  옵션을 안 고른 채 눌러 막힘(안내로 옵션 칸으로 보냄)
--
-- visitor_id 는 page_views 와 같은 서버측 일일 회전 해시라 같은 날 방문 기록과 이어 볼
-- 수 있고, 하루가 지나면 이어지지 않는다(개인 식별 불가, 쿠키 없음). 적재는 /api/track 이
-- service_role 로만 한다. 정책이 없어 anon·authenticated 는 읽기·쓰기 불가.

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  product_id uuid references public.products (id) on delete set null,
  kind text not null check (kind in ('add', 'buy', 'need_option')),
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now()
);

create index if not exists product_events_day_idx on public.product_events (day);
create index if not exists product_events_product_idx on public.product_events (product_id);

alter table public.product_events enable row level security;
revoke all on public.product_events from anon, authenticated;

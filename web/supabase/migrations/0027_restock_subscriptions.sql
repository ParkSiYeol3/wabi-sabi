-- 0027: 재입고 알림 구독 (#166)
--
-- 품절 상품을 사려던 고객이 재고 복구를 알 방법이 없어 그대로 이탈했다.
-- 구독해두면 재고가 0 → 양수로 바뀔 때 메일로 알린다(1회성 — 발송 후 구독 해제).
--
-- 로그인 사용자만 구독한다. 비로그인 이메일 수집은 검증·스팸 문제가 생기고,
-- 발송 주소는 계정 이메일을 쓰면 되므로 별도 저장하지 않는다(변경돼도 최신값 사용).

create table public.restock_subscriptions (
  id uuid primary key default gen_random_uuid (),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 같은 상품에 중복 구독 방지(발송 중복 차단).
  unique (product_id, user_id)
);

-- 재입고 발송 시 상품별 구독자 조회.
create index if not exists restock_subscriptions_product_idx
  on public.restock_subscriptions (product_id);

alter table public.restock_subscriptions enable row level security;

-- 본인 것만 신청/조회/취소. 발송은 어드민(service_role)이 RLS 우회로 처리.
create policy "restock insert own"
  on public.restock_subscriptions for insert
  with check (auth.uid() = user_id);
create policy "restock select own"
  on public.restock_subscriptions for select
  using (auth.uid() = user_id);
create policy "restock delete own"
  on public.restock_subscriptions for delete
  using (auth.uid() = user_id);

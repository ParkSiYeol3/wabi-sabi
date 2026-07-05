-- 0013: 어드민 액션 감사로그 (보안_체크리스트 P0 접근통제)
-- 어드민(대표님)이 상품·주문·게시판에 가한 변경을 기록 — 오작동·분쟁 시 추적.
-- 쓰기·읽기 모두 service_role 전용(RLS 활성 + 정책 없음). 어드민 페이지는
-- 서버에서 admin 클라이언트로 조회하므로 사용자 정책 불필요.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,          -- 예: product.create, order.set_tracking
  target_table text,             -- 대상 테이블(products/orders/...)
  target_id text,                -- 대상 행 id(문자열 — uuid 아닌 것도 허용)
  meta jsonb,                    -- 부가 정보(변경 요약)
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id);

alter table public.admin_audit_log enable row level security;
-- 정책 없음 → service_role 만 접근(로그 위·변조 방지).

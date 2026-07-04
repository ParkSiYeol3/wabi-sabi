-- 0012: 주문 쓰기 서버 전용화 (#62)
-- 취약점: 사용자 insert 정책이 남아 있어 서버 액션을 우회한 직접 쓰기 가능.
--   ① order_items "own order_items insert"(0003) — 본인 주문이면 status 무관 insert 허용.
--      3,000원 주문 생성 후 PostgREST 로 고가 상품 항목을 직접 추가 → 결제 확정은
--      orders.total_price 만 검증하므로 3,000원 결제로 전체 항목 paid 처리(발송·재고 차감).
--   ② gift_options 동일 구조(0003).
--   ③ orders "own orders insert"(0002) — 직접 insert 로 서버 액션의 남용 가드
--      (pending≥5·시간당 10건) 우회, total_price 임의 지정 가능.
-- 조치: 사용자 insert 전면 회수. 주문 생성(createPendingOrder)이 service_role 로 쓰기.
-- select(본인 조회) 정책은 유지 — 마이페이지 주문 내역에 필요.

drop policy if exists "own order_items insert" on public.order_items;
drop policy if exists "own gift_options insert" on public.gift_options;
drop policy if exists "own orders insert" on public.orders;

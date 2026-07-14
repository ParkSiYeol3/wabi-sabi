-- 0019: 뉴스레터 구독취소 토큰 (#116)
--
-- 0017 은 구독 수집만 만들었다. 구독자가 스스로 해지할 방법이 없는데,
-- 정보통신망법 §50 은 광고성 정보에 수신거부 수단을 반드시 제공하도록 한다.
-- (개인정보처리방침에도 "처리 정지를 요구할 수 있다"고 적어뒀다.)
--
-- 메일 수신자는 로그인 상태가 아니므로 링크만으로 해지할 수 있어야 한다.
-- 이메일 주소를 링크에 넣으면 남의 주소를 넣어 임의 해지가 가능하므로,
-- 추측 불가능한 토큰(uuid v4)을 쓴다. 토큰은 구독자당 1개, 노출돼도 해당
-- 구독의 해지만 가능하다(다른 정보 조회 불가 — 조회는 service_role 전용).

alter table public.newsletter_subscribers
  add column unsubscribe_token uuid not null default gen_random_uuid();

create unique index newsletter_subscribers_token_idx
  on public.newsletter_subscribers (unsubscribe_token);

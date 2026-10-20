-- 0083 채팅 상담(#881) — 손님과 대표님의 1:1 대화.
--
-- 손님 한 명(회원 계정 또는 비회원 브라우저)에 대화방 하나. 회원은 user_id, 비회원은
-- httpOnly 쿠키에 둔 무작위 표식의 sha256(guest_key_hash)로 자기 방을 찾는다.
-- 읽기·쓰기는 전부 서버(service_role)가 신원을 확인한 뒤에 한다 → anon·authenticated 는
-- 표에 직접 접근하지 못하게 막는다(RLS 켜고 정책 없음 + 권한 회수).
--
-- 회원이 탈퇴해도 문의(0018)처럼 기록은 남긴다(user_id → null). 소비자 상담 기록이라
-- 마지막 상담일로부터 3년 보관 후 크론이 지운다(처리방침 3조).

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  guest_key_hash text unique check (guest_key_hash ~ '^[0-9a-f]{64}$'),
  guest_email text check (guest_email is null or char_length(guest_email) <= 254),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_sender text check (last_sender in ('customer', 'admin')),
  last_preview text check (last_preview is null or char_length(last_preview) <= 120),
  last_admin_at timestamptz,
  admin_read_at timestamptz,
  customer_read_at timestamptz,
  -- 새 문의 메일을 보낸 시각. 대표님이 답한 뒤(last_admin_at 이후) 새로 물으면 다시 보낸다.
  admin_notified_at timestamptz,
  -- 회원 방과 비회원 방을 겸하지 않는다(탈퇴 뒤엔 둘 다 비어 대표님만 본다).
  constraint chat_threads_owner check (not (user_id is not null and guest_key_hash is not null))
);

create index if not exists chat_threads_recent on public.chat_threads (last_message_at desc);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread on public.chat_messages (thread_id, id);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.chat_threads from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;

-- 0018: 회원탈퇴 대비 — 문의 글을 탈퇴 시에도 보존 (#113)
--
-- 0006 은 inquiries.user_id 를 not null + on delete cascade 로 뒀다. 이 상태로
-- 회원을 삭제하면 문의가 함께 사라지는데, 개인정보처리방침(#106)에 명시한
-- "소비자의 불만 또는 분쟁처리에 관한 기록 3년 보존"(전자상거래법)과 충돌한다.
-- orders 는 이미 on delete set null 이라 같은 방식으로 맞춘다 — 글은 남기고
-- 작성자 연결만 끊어 익명화한다(개인정보는 파기, 분쟁 기록은 보존).
--
-- 비밀글 노출 주의: 기존 read 정책은 `is_secret = false or auth.uid() = user_id`.
-- user_id 가 null 이 되면 auth.uid() = null 은 참이 될 수 없어(NULL 비교) 일반
-- 사용자에겐 계속 안 보인다. 다만 의도를 명시적으로 남기기 위해 정책을 다시 쓴다.

alter table public.inquiries
  alter column user_id drop not null;

alter table public.inquiries
  drop constraint inquiries_user_id_fkey;

alter table public.inquiries
  add constraint inquiries_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

-- 읽기 정책 재정의 — 탈퇴로 user_id 가 null 이 된 비밀글은 작성자가 없으므로
-- 어떤 일반 사용자에게도 보이지 않는다(어드민은 service_role 로 조회).
drop policy if exists "inquiries read" on public.inquiries;

create policy "inquiries read"
  on public.inquiries for select
  using (
    is_secret = false
    or (user_id is not null and auth.uid() = user_id)
  );

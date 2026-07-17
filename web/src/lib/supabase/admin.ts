import { createClient } from "@supabase/supabase-js";

// 서버 전용 — service_role 키로 RLS 우회. 절대 클라이언트로 import 금지.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// createAdminClient() 는 URL·service_role 키 둘 다 필요하다. 키만 검사하면 URL 빠진
// 배포에서 createAdminClient() 가 매번 throw 한다(rate-limit 은 그때 인메모리로 조용히
// 폴백해 공유 상한이 약해진다). 둘 다 있어야 "설정됨" 으로 본다.
export function adminConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

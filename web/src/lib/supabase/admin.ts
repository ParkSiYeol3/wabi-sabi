import { createClient } from "@supabase/supabase-js";

// 서버 전용 — service_role 키로 RLS 우회. 절대 클라이언트로 import 금지.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function adminConfigured() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

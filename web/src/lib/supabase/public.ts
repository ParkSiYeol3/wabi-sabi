import { createClient } from "@supabase/supabase-js";

// 공개 데이터 전용 Supabase 클라이언트 (#177).
// 쿠키·세션에 의존하지 않으므로 unstable_cache 안에서 쓸 수 있다(서버 클라이언트는
// cookies() 를 읽어 캐시 밖에서만 동작). anon 권한이라 공개 RLS 데이터(products·
// site_content 등)만 조회한다 — 사용자별 데이터에는 절대 쓰지 말 것.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

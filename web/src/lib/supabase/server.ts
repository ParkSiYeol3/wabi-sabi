import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트 / 서버 액션 / Route Handler 에서 사용.
// Next.js 16: cookies() 는 async — 반드시 await.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 에서 호출되면 set 이 불가 — proxy 가 세션을 갱신하므로 무시 가능.
          }
        },
      },
    },
  );
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Supabase 세션 토큰을 매 요청마다 갱신해 쿠키에 반영.
// Next.js 16: middleware → proxy (nodejs 런타임). 함수 자체는 동일 패턴.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase 미설정(.env.local 비어있음) 이면 세션 갱신 스킵 — 셋업 전에도 dev 동작.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims/getUser 로 토큰을 검증·갱신 (이 호출 사이에 다른 로직 넣지 말 것).
  await supabase.auth.getUser();

  return supabaseResponse;
}

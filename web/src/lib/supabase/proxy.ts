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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 안 한 채 관리자 주소로 오면 그 주소를 들고 로그인으로 보낸다. 채팅 알림 메일의
  // '채팅 상담 열기'로 왔는데 로그인 뒤 대시보드로만 갔다(시열님). requireAdmin 은 경로를
  // 몰라 /admin 으로만 돌려보낸다. 화면 요청(GET)만, 서버 액션 POST 는 그대로 둔다.
  const { pathname, search } = request.nextUrl;
  if (!user && request.method === "GET" && /^\/admin(\/|$)/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }

  return supabaseResponse;
}

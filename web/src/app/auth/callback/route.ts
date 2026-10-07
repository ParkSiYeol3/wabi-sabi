import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordSignupConsentOnce } from "@/lib/consent-record";

// 소셜/매직링크 첫 로그인이면 동의 이력을 남긴다(이메일 가입은 트리거가 기록).
// 콜백을 못 거친 로그인은 AuthProvider → recordLoginConsent 가 받친다(#813).

// OAuth/매직링크 콜백 — 코드를 세션으로 교환 후 redirect.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/";

  // 소셜 계정 연결(linkIdentity) 흐름 표시 — 실패 시 로그인 실패와 다르게 안내한다.
  const isLink = searchParams.get("flow") === "link";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await recordSignupConsentOnce(user.id);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
    // 연결 흐름에서 실패(대개 그 소셜이 이미 다른 계정에 연결됨) → 마이페이지에 안내.
    if (isLink) {
      return NextResponse.redirect(`${origin}/mypage?link_error=1`);
    }
  }

  if (isLink) {
    return NextResponse.redirect(`${origin}/mypage?link_error=1`);
  }
  return NextResponse.redirect(`${origin}/auth?error=oauth`);
}

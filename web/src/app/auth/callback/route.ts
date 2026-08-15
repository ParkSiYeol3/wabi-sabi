import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_VERSIONS } from "@/lib/consent";

// 소셜/매직링크 첫 로그인이면 동의 이력을 남긴다(이메일 가입은 트리거가 기록).
// 동의 기록 실패가 로그인을 막지 않도록 조용히 넘어간다(다음 로그인 때 재시도됨).
async function recordSocialConsentOnce(userId: string) {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("user_consents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "terms");
    if (count) return; // 이미 이력 있음(이메일 가입 트리거 등)
    await admin.from("user_consents").insert([
      { user_id: userId, type: "terms", version: CONSENT_VERSIONS.terms, agreed: true },
      { user_id: userId, type: "privacy", version: CONSENT_VERSIONS.privacy, agreed: true },
    ]);
  } catch {
    // env 미설정·일시 오류 — 로그인은 계속 진행.
  }
}

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
      if (user) await recordSocialConsentOnce(user.id);
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

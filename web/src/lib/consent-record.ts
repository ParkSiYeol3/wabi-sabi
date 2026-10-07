import "server-only";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_VERSIONS, privacyConsentVersion } from "@/lib/consent";

// 소셜 로그인(카카오·구글) 가입자의 약관·개인정보 동의 이력을 한 번 남긴다. 로그인 화면의
// "소셜 계정으로 계속하면 이용약관과 개인정보 수집·이용에 동의하는 것으로 간주" 안내를 보고
// 누른 그 로그인이 동의 시점이다. 이미 이력이 있으면(이메일 가입 트리거 등) 아무것도 안 한다.
// /auth/callback 과, 콜백을 못 거친 로그인(#813)을 받치는 recordLoginConsent 가 같이 쓴다.
// 기록 실패가 로그인을 막지 않게 하되, 조용히 삼키지 않고 로그로 남긴다.
export async function recordSignupConsentOnce(userId: string): Promise<void> {
  if (!adminConfigured()) return;
  try {
    const admin = createAdminClient();
    const { count, error: countError } = await admin
      .from("user_consents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "terms");
    if (countError) throw countError;
    if (count) return;
    const { error } = await admin.from("user_consents").insert([
      { user_id: userId, type: "terms", version: CONSENT_VERSIONS.terms, agreed: true },
      { user_id: userId, type: "privacy", version: privacyConsentVersion(), agreed: true },
    ]);
    if (error) throw error;
  } catch (e) {
    console.error("[consent] 가입 동의 기록 실패", e instanceof Error ? e.message : e);
  }
}

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

// 마케팅 동의 이력 한 행 추가. user_consents(0050)는 insert 정책이 없어 service_role
// 전용이다 — 사용자가 직접 쓸 수 없고 서버만 기록한다. 이력이라 update 하지 않고
// 매번 append 하며, 최신 행이 현재 상태다(동의·철회 모두 남는다).
// 마이페이지 토글(account-actions)과 메일의 수신거부 링크(#919)가 같이 쓴다. 'use server'
// 파일에 두면 아무 userId 로나 부를 수 있는 서버 액션이 되므로 여기(server-only)에 둔다.
export async function recordMarketingConsent(
  userId: string,
  agreed: boolean,
): Promise<boolean> {
  if (!adminConfigured()) return false;
  const { error } = await createAdminClient().from("user_consents").insert({
    user_id: userId,
    type: "marketing",
    version: CONSENT_VERSIONS.marketing,
    agreed,
  });
  if (error) {
    console.error("[consent] 마케팅 동의 기록 실패", error);
    return false;
  }
  return true;
}

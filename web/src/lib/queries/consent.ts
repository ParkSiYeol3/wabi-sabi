import { createClient } from "@/lib/supabase/server";

// 동의 이력 조회(#671). user_consents(0050)는 이력 테이블이라 **최신 행이 현재 값**이다
// (동의·철회가 한 행씩 쌓인다). RLS 로 본인 것만 읽힌다.
//
// 기록이 아예 없으면 false(미동의)로 본다 — 동의 기능(0050, 2026-08 중순)보다 먼저
// 가입한 회원과, 마케팅 항목을 한 번도 만진 적 없는 소셜 가입 회원이 여기 해당한다.
export async function getMarketingConsent(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_consents")
    .select("agreed")
    .eq("user_id", userId)
    .eq("type", "marketing")
    .order("agreed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ agreed: boolean }>();
  return data?.agreed ?? false;
}

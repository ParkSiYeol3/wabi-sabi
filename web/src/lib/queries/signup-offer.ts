import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { SignupOffer } from "@/lib/coupons";

// 가입 축하 쿠폰 정의(#722) — 가입 자동 지급(auto_issue_signup)·활성 쿠폰 하나.
// 비로그인 손님에게 "가입하면 이 쿠폰을 드려요"를 알리는 데 쓴다. 쿠폰을 끄거나
// 자동 지급을 해제하면 null 이 되어 모든 안내가 함께 사라진다(따로 끌 스위치 없음).
//
// 공개 RLS("coupons public read active")로 anon 이 읽을 수 있다. 전역 layout 에서
// 부르므로 env 가 없거나 조회가 실패해도 절대 터지지 않고 null 로 떨어진다.
export const SIGNUP_OFFER_TAG = "signup-offer";

async function loadSignupOffer(): Promise<SignupOffer | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return null;
  try {
    const { data } = await createPublicClient()
      .from("coupons")
      .select("*")
      .eq("auto_issue_signup", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SignupOffer>();
    if (!data) return null;
    // 정의 기한이 이미 지났으면 가입해도 못 쓴다 — 안내하지 않는다.
    if (data.expires_at && new Date(data.expires_at) <= new Date()) return null;
    return data;
  } catch {
    return null;
  }
}

export const getSignupOffer = unstable_cache(loadSignupOffer, ["signup-offer"], {
  revalidate: 300,
  tags: [SIGNUP_OFFER_TAG],
});

import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { signupOfferLive, type SignupOffer } from "@/lib/coupons";

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
    return data;
  } catch {
    return null;
  }
}

const cachedSignupOffer = unstable_cache(loadSignupOffer, ["signup-offer"], {
  revalidate: 300,
  tags: [SIGNUP_OFFER_TAG],
});

// 캐시는 만료 시각을 모른다 — 꺼낼 때마다 지금 기준으로 다시 판정한다.
export async function getSignupOffer(): Promise<SignupOffer | null> {
  const offer = await cachedSignupOffer();
  return signupOfferLive(offer) ? offer : null;
}

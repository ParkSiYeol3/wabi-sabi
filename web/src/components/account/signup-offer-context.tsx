"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { signupOfferLive, type SignupOffer } from "@/lib/coupons";

// 가입 축하 쿠폰 정의를 전역 layout 에서 한 번 읽어 아래로 내려준다(#722).
// 하단 카드·비회원 결제 안내가 같은 값을 보므로 조회는 한 번, 문구 규칙도 하나다.
//
// ⚠ layout 은 페이지를 옮겨 다녀도 다시 실행되지 않는다. 탭을 열어 둔 손님은 그사이
// 대표님이 쿠폰을 꺼도, 기한이 지나도 처음 받은 값을 계속 들고 있다. 그래서 안내를
// **띄우기 직전에** refresh() 로 지금 값을 다시 읽는다(공개 RLS 라 anon 으로 충분).
// 네트워크가 실패하면 들고 있던 값을 그대로 쓴다 — 안내가 괜히 사라지지 않게.
type Ctx = {
  offer: SignupOffer | null;
  refresh: () => Promise<SignupOffer | null>;
};

const SignupOfferContext = createContext<Ctx>({
  offer: null,
  refresh: async () => null,
});

export function SignupOfferProvider({
  offer: initial,
  children,
}: {
  offer: SignupOffer | null;
  children: React.ReactNode;
}) {
  const [offer, setOffer] = useState(initial);
  const current = useRef(initial);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await createClient()
        .from("coupons")
        .select("*")
        .eq("auto_issue_signup", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<SignupOffer>();
      if (error) throw error;
      const next = signupOfferLive(data) ? data : null;
      current.current = next;
      setOffer(next);
      return next;
    } catch {
      return signupOfferLive(current.current) ? current.current : null;
    }
  }, []);

  const value = useMemo(() => ({ offer, refresh }), [offer, refresh]);
  return (
    <SignupOfferContext.Provider value={value}>
      {children}
    </SignupOfferContext.Provider>
  );
}

export function useSignupOffer(): SignupOffer | null {
  return useContext(SignupOfferContext).offer;
}

export function useRefreshSignupOffer(): () => Promise<SignupOffer | null> {
  return useContext(SignupOfferContext).refresh;
}

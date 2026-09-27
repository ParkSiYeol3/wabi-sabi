"use client";

import { createContext, useContext } from "react";
import type { SignupOffer } from "@/lib/coupons";

// 가입 축하 쿠폰 정의를 전역 layout 에서 한 번 읽어 아래로 내려준다(#722).
// 하단 카드·비회원 결제 안내가 같은 값을 보므로 조회는 한 번, 문구 규칙도 하나다.
const SignupOfferContext = createContext<SignupOffer | null>(null);

export function SignupOfferProvider({
  offer,
  children,
}: {
  offer: SignupOffer | null;
  children: React.ReactNode;
}) {
  return (
    <SignupOfferContext.Provider value={offer}>
      {children}
    </SignupOfferContext.Provider>
  );
}

export function useSignupOffer(): SignupOffer | null {
  return useContext(SignupOfferContext);
}

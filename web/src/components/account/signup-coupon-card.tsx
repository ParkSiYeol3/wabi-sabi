"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import {
  couponLabel,
  signupOfferTerms,
  type SignupOffer,
} from "@/lib/coupons";
import {
  useRefreshSignupOffer,
  useSignupOffer,
} from "@/components/account/signup-offer-context";

// 가입 축하 쿠폰 안내(#722) — 비로그인 손님에게 "가입하면 쿠폰을 드려요"를 알린다.
// 오픈 후 신규 가입이 0명인데, 가입 혜택을 알 방법이 사이트 어디에도 없었다.
//
// 모양·자리·빈도는 시열님 결정(2026-09-26):
// - 화면 아래 작은 카드. 배경을 가리지 않는 비차단형이라 둘러보던 흐름을 끊지 않는다.
// - 홈 제외 — 대표님이 홈 상단 공지 바를 뺐던 기록이 있어 홈의 분위기는 그대로 둔다.
//   가입·로그인·결제·마이페이지도 뺀다(가입 화면 자체, 결제는 전용 안내가 따로 있다).
// - 닫으면 7일간 안 보인다. 다시 찾아온 손님에게 한 번 더 알리되 매번 귀찮게 하진 않는다.
// - 모바일 상품 상세는 하단 구매 바가 이미 떠 있어 카드가 그걸 덮는다 → 구매 바 위에
//   얇은 한 줄 띠(SignupCouponStrip)로 대신한다. 구매 버튼은 매출과 직결이라 가리면 안 된다.
//
// 문구는 DB 쿠폰 정의에서 파생한다(signupOfferTerms). 쿠폰을 끄면 안내도 사라진다.

const DISMISS_KEY = "wasa_signup_offer_dismissed";
const DISMISS_EVENT = "wasa:signup-offer-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
// 들어오자마자 튀어나오면 광고처럼 느껴진다 — 페이지를 먼저 보게 한 뒤 띄운다.
const SHOW_DELAY_MS = 1500;
const PRODUCT_DETAIL = /^\/shop\/[^/]+$/;

function hiddenOn(pathname: string): boolean {
  if (pathname === "/") return true;
  return ["/admin", "/auth", "/checkout", "/mypage"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false; // 저장소 차단(사생활 보호 모드 등) — 그냥 보여 준다.
  }
}

// 50,000 → "5만원". 한 줄 띠는 폭이 좁아 짧게 쓴다.
function shortWon(n: number): string {
  return n % 10000 === 0
    ? `${n / 10000}만원`
    : `${n.toLocaleString("ko-KR")}원`;
}

type Banner = {
  offer: SignupOffer;
  label: string;
  signupHref: string;
  motion: string;
  dismiss: () => void;
};

// 카드와 띠가 같은 규칙(대상·자리·지연·닫음)을 쓴다. 보여 줄 때만 값을 돌려준다.
function useSignupOfferBanner(): Banner | null {
  const offer = useSignupOffer();
  const refresh = useRefreshSignupOffer();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closed, setClosed] = useState(false);

  const eligible =
    !!offer && !authLoading && !user && !closed && !hiddenOn(pathname);

  useEffect(() => {
    if (!eligible || dismissedRecently()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // 띄우기 직전에 쿠폰이 지금도 유효한지 다시 확인한다 — 탭을 열어 둔 사이 꺼졌거나
      // 기한이 지났으면 안내하지 않는다(layout 값은 페이지 이동에도 갱신되지 않는다).
      const live = await refresh();
      if (cancelled || !live) return;
      setVisible(true);
      // 다음 프레임에 들어오는 애니메이션(살짝 올라오며 나타남).
      requestAnimationFrame(() => setEntered(true));
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eligible, refresh]);

  // 카드와 띠 중 하나를 닫으면 다른 쪽도 닫힌다(화면 폭이 바뀌어 반대쪽이 드러나도).
  useEffect(() => {
    const onDismiss = () => setClosed(true);
    window.addEventListener(DISMISS_EVENT, onDismiss);
    return () => window.removeEventListener(DISMISS_EVENT, onDismiss);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 저장 못 해도 이번 방문 동안은 닫힌다.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  if (!offer || !eligible || !visible) return null;
  return {
    offer,
    label: `${couponLabel(offer)} 쿠폰`,
    // 가입 후 지금 보던 페이지로 돌아오게 한다(auth 는 내부 경로만 허용).
    signupHref: `/auth?tab=signup&redirect=${encodeURIComponent(pathname)}`,
    motion: `transition-all duration-500 motion-reduce:transition-none ${
      entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
    }`,
    dismiss,
  };
}

// 전역 하단 카드 — layout 에 마운트. 모바일 상품 상세에선 띠가 대신하므로 숨긴다.
export function SignupCouponCard() {
  const banner = useSignupOfferBanner();
  const pathname = usePathname();
  if (!banner) return null;
  const { offer, label, signupHref, motion, dismiss } = banner;
  const onDetail = PRODUCT_DETAIL.test(pathname);

  return (
    <aside
      aria-label="회원가입 혜택 안내"
      className={`fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 break-keep border border-wabi-border bg-wabi-bg p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:inset-x-auto md:bottom-6 md:right-6 md:w-80 ${motion} ${
        onDetail ? "hidden md:block" : ""
      }`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="안내 닫기"
        className="absolute right-1.5 top-1.5 p-2 text-wabi-fg-muted transition hover:text-wabi-fg"
      >
        <X className="size-4" />
      </button>
      <p className="text-xs tracking-wide text-wabi-accent">회원 혜택</p>
      <p className="mt-1.5 pr-6 text-[15px] font-medium leading-6 text-wabi-fg">
        가입하면 {label}을 드려요
      </p>
      <p className="mt-1 text-xs leading-5 text-wabi-fg-muted">
        {signupOfferTerms(offer)}
      </p>
      <Link
        href={signupHref}
        className="mt-4 block w-full bg-wabi-accent py-2.5 text-center text-sm text-white transition hover:bg-wabi-accent/90"
      >
        회원가입하고 받기
      </Link>
    </aside>
  );
}

// 모바일 상품 상세의 한 줄 띠 — 구매 바와 **같은 고정 컨테이너 안, 바로 위**에 둔다.
// 처음엔 구매 바 높이를 재서 따로 띄웠는데, 상세는 스트리밍이라 본문이 숨김 상태로
// 먼저 도착하는 순간이 있고 그때 재면 높이가 0 이 나와 띠가 구매 바 뒤로 숨었다
// (느린 응답에서 재현). 같은 컨테이너에 쌓으면 잴 것이 없다.
export function SignupCouponStrip() {
  const banner = useSignupOfferBanner();
  if (!banner) return null;
  const { offer, label, signupHref, motion, dismiss } = banner;

  return (
    <aside
      aria-label="회원가입 혜택 안내"
      className={`pointer-events-auto mx-3 mb-2 flex items-center rounded-xl border border-wabi-border bg-wabi-bg/95 shadow-[0_4px_18px_rgba(0,0,0,0.10)] backdrop-blur ${motion}`}
    >
      {/* 좁은 화면에서 잘려도 조건(최소 주문)은 남아야 한다 — 조건 없이 "무료배송"만
          보이면 과장 안내다. 그래서 앞쪽 문구만 줄이고 조건은 줄바꿈·잘림 없이 둔다. */}
      <Link
        href={signupHref}
        className="flex min-w-0 flex-1 items-center gap-1 py-2.5 pl-4 text-[13px] text-wabi-fg"
      >
        <span className="min-w-0 truncate">
          <span className="text-wabi-accent">가입 혜택</span>{" "}
          <span className="font-medium">{label}</span>
        </span>
        {offer.min_order > 0 && (
          <span className="shrink-0 whitespace-nowrap text-wabi-fg-muted">
            · {shortWon(offer.min_order)} 이상
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="안내 닫기"
        className="shrink-0 p-2.5 text-wabi-fg-muted"
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}

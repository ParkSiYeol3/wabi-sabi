"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { Toast } from "@/components/ui/toast";
import {
  couponLabel,
  effectiveExpiry,
  lastUsableIso,
  type Coupon,
} from "@/lib/coupons";

// 가입 직후 쿠폰 지급 알림(#722) — 가입 축하 쿠폰이 지갑에 들어왔다는 걸 한 번 알린다.
// 가입 트리거가 조용히 넣어 두기만 해서, 손님은 결제 화면에 가서야 쿠폰이 있는 걸 안다.
//
// - 가입 자동 지급 쿠폰(auto_issue_signup) 중 안 쓰고 기한이 남은 것만.
// - 사람·쿠폰마다 한 번(기기별 localStorage). 다른 기기에선 한 번 더 볼 수 있다 —
//   여전히 사실인 안내라 해롭지 않다.
// - 신규 가입자에겐 닉네임 설정 모달(닫기 불가)이 먼저 뜬다. 그 위에 토스트가 겹치지
//   않게, 닉네임이 정해진 뒤에 띄운다(NicknameGate 가 저장 성공 시 이벤트를 쏜다).
// - 어드민·결제 화면에선 띄우지 않는다(결제 버튼을 가리지 않게).

const SEEN_KEY = "wasa_signup_coupon_seen";
export const NICKNAME_SET_EVENT = "wasa:nickname-set";

type WalletRow = {
  coupon_id: string;
  expires_at: string | null;
  coupons: (Coupon & { auto_issue_signup: boolean }) | null;
};

function readSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function markSeen(key: string) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen(), key].slice(-20)));
  } catch {
    // 저장 못 하면 다음에 한 번 더 보일 뿐이다.
  }
}

export function SignupCouponWelcome() {
  const uid = useAuthStore((s) => s.user?.id ?? null);
  const pathname = usePathname();
  const [notice, setNotice] = useState<{ label: string; until: string | null } | null>(null);
  // 닉네임 저장 뒤 다시 확인하기 위한 신호.
  const [recheck, setRecheck] = useState(0);

  const skip =
    !uid || pathname.startsWith("/admin") || pathname.startsWith("/checkout");

  useEffect(() => {
    const onSet = () => setRecheck((n) => n + 1);
    window.addEventListener(NICKNAME_SET_EVENT, onSet);
    return () => window.removeEventListener(NICKNAME_SET_EVENT, onSet);
  }, []);

  useEffect(() => {
    if (skip || !uid) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname_set")
        .eq("id", uid)
        .maybeSingle<{ nickname_set: boolean }>();
      if (profile?.nickname_set === false) return; // 닉네임 모달이 먼저다

      const { data } = await supabase
        .from("user_coupons")
        .select("coupon_id, expires_at, coupons(*)")
        .eq("user_id", uid)
        .is("used_at", null);
      const now = Date.now();
      const seen = readSeen();
      const row = ((data ?? []) as unknown as WalletRow[]).find((r) => {
        const c = r.coupons;
        if (!c?.auto_issue_signup || !c.is_active) return false;
        if (seen.includes(`${uid}:${r.coupon_id}`)) return false;
        const until = effectiveExpiry(c.expires_at, r.expires_at);
        return !until || new Date(until).getTime() > now;
      });
      if (!row?.coupons || cancelled) return;
      markSeen(`${uid}:${row.coupon_id}`);
      const until = effectiveExpiry(row.coupons.expires_at, row.expires_at);
      setNotice({
        label: couponLabel(row.coupons),
        until: until
          ? new Date(lastUsableIso(until)).toLocaleDateString("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "long",
              day: "numeric",
            })
          : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [skip, uid, recheck]);

  const close = useCallback(() => setNotice(null), []);

  if (!notice || skip) return null;

  return (
    <Toast
      tone="default"
      duration={10000}
      onClose={close}
      message={
        <>
          가입 축하 <b className="font-medium">{notice.label} 쿠폰</b>이
          들어왔어요
          {/* 날짜·링크는 한 덩어리로 — "10월 27 / 일까지" 처럼 끊기지 않게. */}
          {notice.until && (
            <span className="whitespace-nowrap"> ({notice.until}까지)</span>
          )}
          .{" "}
          <Link
            href="/mypage#coupons"
            onClick={close}
            className="whitespace-nowrap underline underline-offset-4"
          >
            내 쿠폰 보기
          </Link>
        </>
      }
    />
  );
}

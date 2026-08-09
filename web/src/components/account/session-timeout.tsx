"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";

// 로그인 지속시간 제한 — 개인정보보호 보안 정책(시열님/대표님).
//  • 미활동 30분 : 마지막 조작 후 30분 지나면 자동 로그아웃(공용 PC 방치 보호)
//  • 절대 7일    : 로그인 후 7일 지나면 활동 중이라도 재로그인 요구
// Supabase 세션 타임박스·유휴 만료는 Pro 대시보드 기능이라, 플랜과 무관하게
// 동작하도록 앱에서 직접 강제한다. 타임스탬프는 localStorage 공유(멀티탭 일관).
const IDLE_MS = 30 * 60 * 1000; // 미활동 30분
const MAX_MS = 7 * 24 * 60 * 60 * 1000; // 절대 7일
const CHECK_MS = 30 * 1000; // 30초마다 점검
const START_KEY = "wabi.session.start"; // 로그인 시각(절대 만료 기산점)
const LAST_KEY = "wabi.session.last"; // 마지막 활동 시각(미활동 기산점)

// 로그아웃 후 로그인 화면으로 사유와 함께 보낼 개인 영역(공개 페이지 방치는 무해).
const PROTECTED = ["/mypage", "/checkout", "/admin"];

export function SessionTimeout() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  // 만료 시 최신 라우터/경로 참조(리스너 재바인딩 없이). render 중이 아니라
  // 별도 effect 에서 갱신(react-hooks/refs — ref 는 render 중 접근 금지).
  const nav = useRef({ router, pathname });
  useEffect(() => {
    nav.current = { router, pathname };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) {
      // 로그아웃 상태 — 타임스탬프 정리(다음 로그인에서 새로 기산).
      localStorage.removeItem(START_KEY);
      localStorage.removeItem(LAST_KEY);
      return;
    }

    const now = Date.now();
    // 로그인 시작 시각 — 없으면(기존 세션 포함) 지금 기준.
    if (!localStorage.getItem(START_KEY))
      localStorage.setItem(START_KEY, String(now));
    localStorage.setItem(LAST_KEY, String(now));

    // 의도적 조작만 활동으로 인정(마우스 이동만으론 세션 연장 안 함).
    const touch = () => localStorage.setItem(LAST_KEY, String(Date.now()));
    const activity = ["pointerdown", "keydown", "scroll"] as const;
    activity.forEach((e) =>
      window.addEventListener(e, touch, { passive: true }),
    );

    let expiring = false;
    const expire = async (kind: "idle" | "max") => {
      if (expiring) return; // 탭 간·중복 방지
      expiring = true;
      localStorage.removeItem(START_KEY);
      localStorage.removeItem(LAST_KEY);
      try {
        await createClient().auth.signOut();
      } catch {
        // 네트워크 실패해도 아래 라우팅으로 로그아웃 UI 로 전환된다.
      }
      const onProtected = PROTECTED.some((p) =>
        nav.current.pathname.startsWith(p),
      );
      if (onProtected) {
        nav.current.router.replace(`/auth?reason=timeout&kind=${kind}`);
      } else {
        nav.current.router.refresh(); // 헤더 등 로그인 UI 갱신
      }
    };

    const check = () => {
      const t = Date.now();
      const last = Number(localStorage.getItem(LAST_KEY) || t);
      const start = Number(localStorage.getItem(START_KEY) || t);
      if (t - last >= IDLE_MS) void expire("idle");
      else if (t - start >= MAX_MS) void expire("max");
    };

    // 백그라운드 탭 복귀 시 즉시 점검(인터벌이 스로틀될 수 있어).
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    const id = window.setInterval(check, CHECK_MS);
    check(); // 마운트 즉시 1회(복귀 시 만료 감지)

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      activity.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [user]);

  return null;
}

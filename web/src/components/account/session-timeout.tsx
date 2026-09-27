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
//
// ⚠ 페이지를 새로 열 때마다 두 제한이 모두 리셋되던 버그가 있었다(#725, 시열님 제보
// "노트북에서 로그아웃이 안 된다"). 원인 둘:
//   ① 첫 렌더에선 세션 확인 전이라 user 가 잠깐 null 이다. 그걸 "로그아웃"으로 보고
//      기산점을 지웠고, 곧 user 가 오면 "새 로그인"으로 지금부터 다시 셌다(7일도 리셋).
//   ② user 가 오면 만료를 보기 **전에** 마지막 활동을 지금으로 덮어썼다(30분도 리셋).
//      토큰 갱신마다 user 객체가 바뀌어 같은 일이 또 일어났다.
// 그래서: 세션 확인(loading) 중엔 아무것도 하지 않고, user 는 id 로만 보고, 페이지를
// 여는 것 자체는 활동으로 치지 않는다 — 노트북을 열면 브라우저가 탭을 스스로 다시
// 불러오는데, 그건 사람이 한 조작이 아니다.
const IDLE_MS = 30 * 60 * 1000; // 미활동 30분
const MAX_MS = 7 * 24 * 60 * 60 * 1000; // 절대 7일
const CHECK_MS = 30 * 1000; // 30초마다 점검
const START_KEY = "wabi.session.start"; // 로그인 시각(절대 만료 기산점)
const LAST_KEY = "wabi.session.last"; // 마지막 활동 시각(미활동 기산점)

// 로그아웃 후 로그인 화면으로 사유와 함께 보낼 개인 영역(공개 페이지 방치는 무해).
const PROTECTED = ["/mypage", "/checkout", "/admin"];

function read(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function write(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 저장 차단 환경 — 이 탭이 열려 있는 동안만 점검된다.
  }
}

function clear() {
  try {
    localStorage.removeItem(START_KEY);
    localStorage.removeItem(LAST_KEY);
  } catch {}
}

export function SessionTimeout() {
  // user 객체가 아니라 id 로 본다 — 토큰 갱신마다 객체가 바뀌어도 같은 로그인이다.
  const uid = useAuthStore((s) => s.user?.id ?? null);
  const authLoading = useAuthStore((s) => s.loading);
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
    // 세션 확인 중 — 로그아웃으로 오인해 기산점을 지우면 안 된다(①).
    if (authLoading) return;
    if (!uid) {
      // 확인이 끝났는데 로그아웃 상태 — 기산점 정리(다음 로그인에서 새로 기산).
      clear();
      return;
    }

    // 기산점이 없으면 이 브라우저에서 방금 로그인한 것이다. 있으면 그대로 두고
    // 아래 check() 가 먼저 만료를 본다 — 여기서 덮어쓰지 않는다(②).
    const now = Date.now();
    if (read(START_KEY) === null) write(START_KEY, now);
    if (read(LAST_KEY) === null) write(LAST_KEY, now);

    // 의도적 조작만 활동으로 인정(마우스 이동만으론 세션 연장 안 함).
    const touch = () => write(LAST_KEY, Date.now());
    const activity = ["pointerdown", "keydown", "scroll"] as const;

    let expiring = false;
    const expire = async (kind: "idle" | "max") => {
      if (expiring) return; // 탭 간·중복 방지
      expiring = true;
      clear();
      try {
        // 이 기기만 로그아웃 — 노트북을 방치했다고 휴대폰 로그인까지 끊지 않는다.
        await createClient().auth.signOut({ scope: "local" });
      } catch {
        // 네트워크 실패해도 로컬 세션은 지워지고, 아래 라우팅으로 UI 가 바뀐다.
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
      const last = read(LAST_KEY) ?? t;
      const start = read(START_KEY) ?? t;
      if (t - last >= IDLE_MS) void expire("idle");
      else if (t - start >= MAX_MS) void expire("max");
    };

    // 마운트 즉시 먼저 점검한다 — 노트북을 다시 열었을 때 이미 지난 시간을 잡는다.
    // 점검을 통과한 뒤에야 활동 감지를 붙인다(복원 스크롤 등이 먼저 연장하지 않게).
    check();
    if (expiring) return;
    activity.forEach((e) =>
      window.addEventListener(e, touch, { passive: true }),
    );

    // 백그라운드 탭 복귀 시 즉시 점검(인터벌이 스로틀·절전으로 멈출 수 있어).
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    const id = window.setInterval(check, CHECK_MS);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      activity.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [uid, authLoading]);

  return null;
}

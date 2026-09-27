"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";

// 방문 비콘(0054) — 경로가 바뀔 때마다 /api/track 으로 path 를 한 번 보낸다. Vercel Web
// Analytics 와 별개로, admin 대시보드에 방문자 수를 직접 띄우기 위한 자체 카운터.
// 방문자 식별은 서버가 IP+UA 일일 해시로 처리한다(라우트 참조) — 클라는 경로만 보낸다.
// localStorage 난수 방식은 인앱 브라우저(카톡·인스타)에서 매번 초기화돼 순방문자가
// 부풀려져 폐기했다. sendBeacon 우선(언로드에도 유실 없음) → 실패 시 keepalive fetch.
//
// 판별 정보(0070) — "실제 손님이 오는지" 가리려고 개인을 알아볼 수 없는 정보만 더한다:
// 브라우저 언어·시간대, 자동화 표시(navigator.webdriver), 그리고 사람이 조작했는지.
// 조작은 클릭·터치·키 입력·휠만 센다 — 스크롤 이벤트는 브라우저가 위치를 복원하며
// 스스로 내기도 해서 사람의 신호로 쓰지 않는다.

// 어드민의 "이 기기 방문 제외"(StaffDeviceToggle)가 켜는 표시.
export const STAFF_DEVICE_KEY = "wasa_staff_device";

function isStaffDevice(): boolean {
  try {
    return localStorage.getItem(STAFF_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

function send(body: string) {
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/track", blob)) return;
  } catch {
    // sendBeacon 미지원/차단 → fetch 폴백
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function VisitBeacon() {
  const pathname = usePathname();
  // 관리자로 로그인해 있으면 보내지 않는다(서버도 한 번 더 거른다 — 권한 정보는
  // 조금 늦게 붙어 첫 페이지는 서버가 거른다).
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const last = useRef<string | null>(null);
  // 이 탭에서 유입 정보를 이미 보냈는지 — 진입 한 번만 보낸다.
  const sent = useRef(false);

  useEffect(() => {
    // 프로덕션 도메인(wasa.kr)에서만 집계 — 프리뷰 배포(*.vercel.app)·로컬은 제외.
    // 이걸 안 걸면 PR마다 뜨는 프리뷰·개발 로드가 전부 프로덕션 page_views 에 섞여
    // 방문자 수가 말이 안 되게 부풀려진다(서버에서도 한 번 더 거른다).
    if (window.location.hostname !== "wasa.kr") return;
    // 어드민 방문은 매장 통계에서 제외(서버도 한 번 더 거른다).
    if (!pathname || pathname.startsWith("/admin")) return;
    if (isAdmin || isStaffDevice()) return;
    // 같은 경로 재렌더로 중복 전송 방지.
    if (last.current === pathname) return;
    last.current = pathname;
    // 유입 경로(0067) — 어디서 왔는지는 서버가 라벨 하나로 줄여 저장한다(원본 주소·
    // 검색어는 버린다). 첫 진입에서만 의미가 있으므로 그때만 보낸다 — 사이트 안에서
    // 옮겨 다닐 때의 referrer 는 우리 도메인이라 유입이 아니다.
    const first = !sent.current;
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    const info = {
      p: pathname,
      l: navigator.language,
      z: tz,
      w: navigator.webdriver === true,
    };
    const body = JSON.stringify(
      first
        ? { ...info, r: document.referrer || "", q: window.location.search || "" }
        : info,
    );
    sent.current = true;
    send(body);
  }, [pathname, isAdmin]);

  // 사람이 조작했다는 신호 — 탭에서 한 번만 보낸다(서버가 그 방문자의 오늘 기록 전체에
  // 표시한다). 한 페이지만 보고 나가도 클릭·터치를 했으면 사람으로 본다.
  useEffect(() => {
    if (window.location.hostname !== "wasa.kr") return;
    if (isAdmin || isStaffDevice()) return;
    let done = false;
    let timer: number | undefined;
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    const onAct = () => {
      if (done) return;
      done = true;
      events.forEach((e) => window.removeEventListener(e, onAct));
      // 페이지 기록이 서버에 쌓이기 전에 도착하면 표시할 줄이 없어 신호가 사라진다 —
      // 들어오자마자 누른 경우를 위해 잠깐 늦춰 보낸다.
      timer = window.setTimeout(() => send(JSON.stringify({ e: 1 })), 1500);
    };
    events.forEach((e) =>
      window.addEventListener(e, onAct, { passive: true }),
    );
    return () => {
      events.forEach((e) => window.removeEventListener(e, onAct));
      if (timer) window.clearTimeout(timer);
    };
  }, [isAdmin]);

  return null;
}

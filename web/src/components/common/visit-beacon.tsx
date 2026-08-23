"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// 방문 비콘(0054) — 경로가 바뀔 때마다 /api/track 으로 한 번 보낸다. Vercel Web
// Analytics 와 별개로, admin 대시보드에 방문자 수를 직접 띄우기 위한 자체 카운터.
// visitor_id 는 localStorage 의 opaque 난수(순방문자 구분용, 개인식별 아님).
// sendBeacon 우선(언로드에도 유실 없음) → 실패 시 keepalive fetch.

const VISITOR_KEY = "wsv";

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function VisitBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    // 프로덕션 도메인(wasa.kr)에서만 집계 — 프리뷰 배포(*.vercel.app)·로컬은 제외.
    // 이걸 안 걸면 PR마다 뜨는 프리뷰·개발 로드가 전부 프로덕션 page_views 에 섞여
    // 방문자 수가 말이 안 되게 부풀려진다(서버에서도 한 번 더 거른다).
    if (window.location.hostname !== "wasa.kr") return;
    // 어드민 방문은 매장 통계에서 제외(서버도 한 번 더 거른다).
    if (!pathname || pathname.startsWith("/admin")) return;
    // 같은 경로 재렌더로 중복 전송 방지.
    if (last.current === pathname) return;
    last.current = pathname;

    const body = JSON.stringify({ v: visitorId(), p: pathname });
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
  }, [pathname]);

  return null;
}

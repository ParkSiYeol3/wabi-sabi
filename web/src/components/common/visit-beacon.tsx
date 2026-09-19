"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// 방문 비콘(0054) — 경로가 바뀔 때마다 /api/track 으로 path 를 한 번 보낸다. Vercel Web
// Analytics 와 별개로, admin 대시보드에 방문자 수를 직접 띄우기 위한 자체 카운터.
// 방문자 식별은 서버가 IP+UA 일일 해시로 처리한다(라우트 참조) — 클라는 경로만 보낸다.
// localStorage 난수 방식은 인앱 브라우저(카톡·인스타)에서 매번 초기화돼 순방문자가
// 부풀려져 폐기했다. sendBeacon 우선(언로드에도 유실 없음) → 실패 시 keepalive fetch.

export function VisitBeacon() {
  const pathname = usePathname();
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
    // 같은 경로 재렌더로 중복 전송 방지.
    if (last.current === pathname) return;
    last.current = pathname;

    // 유입 경로(0067) — 어디서 왔는지는 서버가 라벨 하나로 줄여 저장한다(원본 주소·
    // 검색어는 버린다). 첫 진입에서만 의미가 있으므로 그때만 보낸다 — 사이트 안에서
    // 옮겨 다닐 때의 referrer 는 우리 도메인이라 유입이 아니다.
    const first = last.current === pathname && !sent.current;
    const body = JSON.stringify(
      first
        ? { p: pathname, r: document.referrer || "", q: window.location.search || "" }
        : { p: pathname },
    );
    sent.current = true;
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

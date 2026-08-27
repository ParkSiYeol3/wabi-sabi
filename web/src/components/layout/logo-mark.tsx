"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// 헤더 붓 마크 — 첫 방문(세션 1회) 시 좌→우로 칠해지듯 등장(clip-path 와이프). 붓으로
// 그은 듯한 브랜드 첫인상(대표님 미감). 로고가 래스터(PNG)라 진짜 stroke-draw 대신
// 마스크 와이프로 근사한다. 매 이동마다 반복하면 거슬리므로 sessionStorage 로 1회 제한,
// reduced-motion 사용자에겐 애니 없이 즉시 표시한다.
export function LogoMark() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("wsb-logo-shown")) return;
      sessionStorage.setItem("wsb-logo-shown", "1");
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const el = ref.current;
      if (!el) return;
      el.classList.add("logo-brush");
      el.addEventListener(
        "animationend",
        () => el.classList.remove("logo-brush"),
        { once: true },
      );
    } catch {
      // sessionStorage 차단 등 — 그냥 애니 없이 표시.
    }
  }, []);

  return (
    <span ref={ref} className="inline-flex">
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={560}
        height={278}
        preload
        className="h-6 w-auto"
      />
    </span>
  );
}

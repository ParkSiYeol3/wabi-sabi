"use client";

import { useEffect } from "react";

// 홈 전용 휠 스무스 스크롤 (#197 피드백 6차).
// 마우스 휠은 OS 가 큰 델타를 스텝 단위로 던져 페이지가 뚝뚝 점프한다 — 연출을
// 아무리 다듬어도 페이지 자체가 튀면 소용없다. 휠 입력만 가로채 목표 위치를
// 쌓고, rAF 루프에서 지수 이징으로 window 스크롤을 실제로 옮긴다(Lenis 방식,
// 라이브러리 없이). 터치·키보드·스크롤바 드래그·reduced-motion 은 건드리지
// 않아 접근성이 유지된다. 홈에서만 마운트되고 페이지를 떠나면 해제된다.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const doc = document.scrollingElement ?? document.documentElement;
    let target = window.scrollY;
    let raf = 0;
    let lastSet = -1; // 우리가 마지막으로 scrollTo 한 위치 — 외부 개입 감지용

    const tick = () => {
      const cur = window.scrollY;
      const next = cur + (target - cur) * 0.08; // 60fps 기준 ~0.6s 글라이드(#213 11차 — 체감 강화)
      if (Math.abs(target - next) < 0.5) {
        lastSet = target;
        window.scrollTo(0, target);
        raf = 0;
        return;
      }
      lastSet = next;
      window.scrollTo(0, next);
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // 핀치 줌 제스처는 그대로
      e.preventDefault();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const max = Math.max(doc.scrollHeight - window.innerHeight, 0);
      target = Math.min(Math.max(target + e.deltaY * unit, 0), max);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // 키보드·스크롤바 등 다른 입력으로 움직이면 목표를 현재 위치로 동기화.
    // 루프 구동 중이라도 스크롤 위치가 우리가 마지막에 쓴 값과 다르면 외부
    // 개입(스크롤바 드래그 등)이다 — 즉시 양보하지 않으면 드래그 위치와 옛
    // 목표점이 프레임마다 싸우며 화면이 진동한다(버그 리포트: 스크롤바 드래그
    // 시 떨림). 애니메이션을 끊고 목표를 현재 위치로 맞춘다.
    const onScroll = () => {
      if (raf) {
        if (Math.abs(window.scrollY - lastSet) > 1.5) {
          cancelAnimationFrame(raf);
          raf = 0;
          target = window.scrollY;
        }
        return;
      }
      target = window.scrollY;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}

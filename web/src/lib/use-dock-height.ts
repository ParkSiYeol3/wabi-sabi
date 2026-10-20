"use client";

import { useEffect, type RefObject } from "react";

// 화면 아래에 붙어 떠 있는 요소(모바일 구매 바, 가입 쿠폰 카드)가 아래에서 차지하는
// 높이를 CSS 변수 --dock-{name} 으로 알린다. 채팅 버튼(#881)이 이 값 위로 비켜 선다.
// 숨겨져 있으면(display:none, 닫힘) 변수를 지워 0 으로 본다.
export function useDockHeight(
  name: string,
  ref: RefObject<HTMLElement | null>,
  active = true,
) {
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    const prop = `--dock-${name}`;
    if (!el || !active) {
      root.style.removeProperty(prop);
      return;
    }
    const update = () => {
      const h = el.offsetHeight;
      if (!h) {
        root.style.removeProperty(prop);
        return;
      }
      const bottom = parseFloat(getComputedStyle(el).bottom) || 0;
      root.style.setProperty(prop, `${Math.round(h + bottom)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty(prop);
    };
  }, [name, ref, active]);
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// 스크롤 진입 애니메이션 (#155) — 애플 제품 페이지식으로 뷰에 들어올 때 요소가
// 아래에서 부드럽게 떠오르며 나타난다. IntersectionObserver 로 한 번만 트리거.
// 외부 라이브러리 없이 클래스 토글이라 CSP·번들 영향 없음.
// prefers-reduced-motion 이면 애니메이션 없이 즉시 표시(모션 민감 사용자 배려).

// stagger 용 지연 — 임의 값 대신 Tailwind 유틸(nonce 전환 대비 인라인 style 회피).
const DELAY: Record<number, string> = {
  0: "",
  100: "delay-100",
  200: "delay-200",
  300: "delay-300",
  400: "delay-[400ms]",
  500: "delay-500",
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: 0 | 100 | 200 | 300 | 400 | 500;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // prefers-reduced-motion 이면 애니메이션 없이 항상 표시(motion-reduce override).
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-[opacity,transform] motion-reduce:translate-y-0! motion-reduce:opacity-100! motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        DELAY[delay],
        className,
      )}
    >
      {children}
    </div>
  );
}

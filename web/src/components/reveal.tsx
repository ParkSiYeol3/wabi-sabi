"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// 스크롤 진입 애니메이션 (#155, #157) — 애플 제품 페이지식으로 뷰에 들어올 때 요소가
// 부드럽게 나타난다. IntersectionObserver 로 한 번만 트리거. 외부 라이브러리 없이
// 클래스 토글이라 CSP·번들 영향 없음. prefers-reduced-motion 이면 애니메이션 없이
// 즉시 표시(motion-reduce override).

// stagger 용 지연 — 임의 값 대신 Tailwind 유틸(nonce 전환 대비 인라인 style 회피).
const DELAY: Record<number, string> = {
  0: "",
  100: "delay-100",
  200: "delay-200",
  300: "delay-300",
  400: "delay-[400ms]",
  500: "delay-500",
};

// 등장 방향/방식. up=아래서 위로(기본), left/right=옆에서, scale=커지며, blur=초점 맞춰지며.
const VARIANTS = {
  up: { hidden: "translate-y-10 opacity-0", shown: "translate-y-0 opacity-100" },
  left: {
    hidden: "-translate-x-10 opacity-0",
    shown: "translate-x-0 opacity-100",
  },
  right: {
    hidden: "translate-x-10 opacity-0",
    shown: "translate-x-0 opacity-100",
  },
  scale: { hidden: "scale-90 opacity-0", shown: "scale-100 opacity-100" },
  blur: {
    hidden: "translate-y-8 opacity-0 blur-md",
    shown: "translate-y-0 opacity-100 blur-none",
  },
} as const;

export type RevealVariant = keyof typeof VARIANTS;
export type RevealDelay = 0 | 100 | 200 | 300 | 400 | 500;

export function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: RevealDelay;
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

  const v = VARIANTS[variant];

  return (
    // prefers-reduced-motion 이면 애니메이션 없이 항상 표시(모든 축 override).
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-[opacity,transform] motion-reduce:translate-x-0! motion-reduce:translate-y-0! motion-reduce:scale-100! motion-reduce:opacity-100! motion-reduce:blur-none! motion-reduce:transition-none",
        shown ? v.shown : v.hidden,
        DELAY[delay],
        className,
      )}
    >
      {children}
    </div>
  );
}

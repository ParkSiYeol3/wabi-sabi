"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { HeroSlideshow } from "@/components/hero-slideshow";

// 히어로 패럴랙스 (#168) — 애플 제품 페이지식 깊이감.
// 배경(상품 슬라이드쇼)은 스크롤보다 느리게 따라오고, 로고·텍스트는 스크롤에 따라
// 서서히 사라지며 다음 섹션에 자리를 내준다.
//
// 초기 렌더는 변형이 없다(transform/opacity 미설정) — 히어로 로고가 LCP 후보라
// 처음부터 opacity 를 낮추면 LCP 가 나빠진다. 스크롤이 시작될 때만 손댄다.
// scroll 은 passive + rAF 로 묶어 프레임당 한 번만 계산한다.

const BG_SPEED = 0.3; // 배경 이동 비율(1=스크롤과 동일, 낮을수록 느리게 = 깊어 보임)
const CONTENT_SPEED = 0.15;
const FADE_RATE = 1.3; // 1 이면 뷰포트 1개 스크롤에 완전히 사라짐

export function HeroParallax({
  images,
  children,
}: {
  images: string[];
  children: ReactNode;
}) {
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight || 1;
      const progress = Math.min(y / vh, 1);

      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(0, ${y * BG_SPEED}px, 0)`;
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translate3d(0, ${y * CONTENT_SPEED}px, 0)`;
        contentRef.current.style.opacity = String(
          Math.max(0, 1 - progress * FADE_RATE),
        );
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-wabi-subtle">
      {/* 배경은 위아래로 여유를 둬야 느리게 밀릴 때 빈 곳이 드러나지 않는다. */}
      {images.length > 0 && (
        <div
          ref={bgRef}
          className="absolute -top-[15%] left-0 h-[130%] w-full will-change-transform"
        >
          <HeroSlideshow images={images} />
        </div>
      )}
      <div
        ref={contentRef}
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-5 py-28 text-center will-change-[opacity,transform] md:py-36"
      >
        {children}
      </div>
    </section>
  );
}

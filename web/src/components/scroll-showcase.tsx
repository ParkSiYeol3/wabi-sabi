"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// 스크롤 스크럽 쇼케이스 (#168) — 애플 제품 페이지식.
// 화면이 sticky 로 고정된 채 스크롤이 진행되면 상품이 하나씩 전환된다.
// 스크롤 위치 → 인덱스 매핑이 핵심 메커니즘으로, 360° 촬영 프레임 세트가 준비되면
// items 를 프레임으로 바꾸는 것만으로 회전 스크럽이 된다(구조 동일).
//
// 성능: scroll 은 passive + rAF, 상태는 인덱스만 둔다(연속 진행도를 state 로 두면
// 프레임마다 리렌더된다 — 인덱스는 전환 시점에만 바뀌므로 리렌더가 상품 수만큼).

const VH_PER_ITEM = 70; // 상품 하나당 스크롤 길이(vh) — 길수록 천천히 넘어간다

export type ShowcaseItem = { id: string; name: string; image: string };

export function ScrollShowcase({ items }: { items: ShowcaseItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);
      // 마지막 구간에서 progress=1 이 되면 인덱스가 범위를 넘으므로 클램프.
      const next = Math.min(
        items.length - 1,
        Math.floor(progress * items.length),
      );
      setIdx(next); // 같은 값이면 React 가 리렌더를 건너뛴다
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items.length]);

  if (items.length === 0) return null;
  const active = items[idx];

  return (
    <section
      ref={wrapRef}
      style={{ height: `${Math.max(items.length, 2) * VH_PER_ITEM}vh` }}
      className="relative bg-wabi-subtle"
      aria-label="상품 둘러보기"
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center px-5">
        {/* 이미지 스택 — 활성만 보이고 나머지는 살짝 축소된 채 숨는다 */}
        <div className="relative aspect-square w-full max-w-md">
          {items.map((it, i) => (
            <Image
              key={it.id}
              src={it.image}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 768px) 90vw, 448px"
              className={cn(
                "object-cover transition-all duration-700 ease-out motion-reduce:transition-none",
                i === idx ? "scale-100 opacity-100" : "scale-95 opacity-0",
              )}
            />
          ))}
        </div>

        {/* 캡션 — 스크린리더에는 현재 상품만 전달 */}
        <p className="mt-10 text-xl font-medium tracking-wide" aria-live="polite">
          {active.name}
        </p>
        <Link
          href={`/shop/${active.id}`}
          aria-label={`${active.name} 상품 보러 가기`}
          className="mt-3 text-sm text-wabi-fg-muted underline underline-offset-4 hover:text-wabi-fg"
        >
          보러 가기
        </Link>

        {/* 진행 인디케이터 */}
        <div className="mt-8 flex gap-2">
          {items.map((it, i) => (
            <span
              key={it.id}
              aria-hidden
              className={cn(
                "h-0.5 w-10 transition-colors duration-500",
                i === idx ? "bg-wabi-fg" : "bg-wabi-border",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

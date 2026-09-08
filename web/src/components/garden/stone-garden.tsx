"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlacedStone } from "@/lib/garden-layout";
import { cn } from "@/lib/utils";

// 돌의 정원 — 가레산스이(枯山水) 감상 화면 (#616, 대표님).
//
// 가레산스이는 들어가는 정원이 아니다. 縁側(엔가와)에 앉아 보기만 한다. 그래서
// 이 화면도 "걸어 들어가는" 동작이 없다 — 세로 스크롤로 파고들지 않고, 좌우로만
// 시선이 움직인다. 앉은 자리는 그대로다.
//
// 그 결과가 곧 운영 정책이기도 하다(대표님 — 팔지만 파는 듯하지 않게): 가격이
// 없고, 담기 버튼이 없고, 재촉하는 문구가 없다. 한 번 누르면 이름만 조용히
// 떠오르고, 정말 궁금한 손님만 한 번 더 눌러 상세로 나간다.

export function StoneGarden({
  stones,
  width,
}: {
  stones: PlacedStone[];
  // 정원의 가로 길이(화면 폭 배수) — 한 화면에 다 담기지 않아야 둘러보게 된다.
  width: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);

  // 휠은 세로로 들어온다 — 정원은 옆으로 흐르므로 가로 스크롤로 옮긴다.
  // React 가 root 에 붙이는 wheel 리스너는 passive 라 preventDefault 가 먹지
  // 않는다 → 여기서 passive:false 로 직접 건다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // 이미 끝에 닿았으면 페이지 스크롤을 막지 않는다(정원에 갇히지 않게).
      const max = el.scrollWidth - el.clientWidth;
      const next = el.scrollLeft + e.deltaY;
      if ((next < 0 && el.scrollLeft === 0) || (next > max && el.scrollLeft === max))
        return;
      e.preventDefault();
      el.scrollLeft = next;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 砂紋 — 손이 지나간 자리에 이는 물결. 상태를 두지 않고 스타일만 직접 만져
  // 리렌더 없이 따라온다. 터치 기기·모션 최소화 설정에서는 붙이지 않는다.
  useEffect(() => {
    const host = scrollRef.current;
    const ripple = rippleRef.current;
    if (!host || !ripple) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = host.getBoundingClientRect();
        ripple.style.opacity = "1";
        ripple.style.transform = `translate(${e.clientX - box.left - 110}px, ${e.clientY - box.top - 110}px)`;
      });
    };
    const onLeave = () => {
      ripple.style.opacity = "0";
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        // 모래밭 — 갈퀴질한 결을 가로로 길게 긋는다(마루와 나란한 방향).
        className="garden-sand relative h-[62vh] min-h-100 overflow-x-auto overflow-y-hidden sm:h-[70vh]"
        // 빈 모래를 누르면 떠올랐던 이름이 가라앉는다.
        onClick={() => setActive(null)}
      >
        <div
          ref={rippleRef}
          aria-hidden
          className="garden-ripple pointer-events-none absolute top-0 left-0 size-55 opacity-0"
        />

        <div className="relative h-full" style={{ width }}>
          {stones.map((s) => {
            const on = active === s.id;
            return (
              <div
                key={s.id}
                className="absolute"
                style={
                  {
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    zIndex: Math.round(s.y),
                    "--s": s.size,
                  } as CSSProperties
                }
              >
                {/* 돌 둘레의 파문 — 물이 없는 곳에 그린 물결. */}
                <span
                  aria-hidden
                  className="garden-samon pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                />
                <Link
                  href={`/shop/${s.id}`}
                  aria-label={on ? `${s.name} 자세히 보기` : s.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 첫 손짓엔 이름만. 정말 보고 싶은 사람만 한 번 더 누른다.
                    if (!on) {
                      e.preventDefault();
                      setActive(s.id);
                    }
                  }}
                  className={cn(
                    "garden-stone relative block overflow-hidden rounded-full transition-[transform,box-shadow] duration-700 ease-out",
                    on
                      ? "scale-[1.04] shadow-[0_10px_30px_rgba(60,52,44,0.18)]"
                      : "shadow-[0_6px_18px_rgba(60,52,44,0.10)]",
                  )}
                >
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 30vw, 18vw"
                    className="object-cover"
                  />
                </Link>

                {/* 이름은 속삭이듯 — 가격도, 담기도 없다. */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-[calc(100%+0.6rem)] left-1/2 w-40 -translate-x-1/2 text-center text-xs leading-5 text-wabi-fg transition-opacity duration-500",
                    on ? "opacity-100" : "opacity-0",
                  )}
                >
                  {s.name}
                  <span className="mt-0.5 block text-[10px] text-wabi-fg-muted">
                    한 번 더 누르면 자세히
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 縁側 — 앉는 자리. 정원 안으로는 들어가지 않는다. */}
      <div
        aria-hidden
        className="garden-engawa pointer-events-none absolute right-0 bottom-0 left-0 h-14 sm:h-20"
      />
    </div>
  );
}

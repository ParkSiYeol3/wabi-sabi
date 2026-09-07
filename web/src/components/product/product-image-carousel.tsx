"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 상세 히어로 사진 넘기기 (#611, 대표님) — 좌우 화살표로 상품 사진을 차례로 본다.
// 아래 갤러리에서 스크롤로도 다 볼 수 있지만, 손님이 첫 화면에서 바로 다음 컷을
// 확인할 수 있어야 한다는 요청.
//
// 가로 스크롤 + scroll-snap 으로 만든다 — 모바일에서 손가락으로 미는 동작이 브라우저
// 기본 동작으로 공짜로 붙고(제스처 처리 코드 없음), 화살표는 그 스크롤을 대신 밀어줄
// 뿐이라 두 입력이 어긋나지 않는다. 현재 장수는 스크롤 위치에서 역산한다.
//
// 확대(줌)는 넣지 않는다 — 상품을 더 크게 보지 못하게 하는 방침(대표님, ProductImageZoom
// 주석 참조). 여기서 늘린 건 "옆으로 넘기기"뿐이다.
export function ProductImageCarousel({
  images,
  name,
  soldOut = false,
}: {
  images: string[];
  name: string;
  soldOut?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  const goTo = (next: number) => {
    const el = trackRef.current;
    if (!el) return;
    // 끝에서 한 번 더 누르면 처음으로(순환) — 사진이 몇 장인지 몰라도 막히지 않는다.
    const target = (next + count) % count;
    el.scrollTo({ left: el.clientWidth * target, behavior: "smooth" });
    setIndex(target);
  };

  // 손가락으로 밀었을 때도 표시가 따라오게 — 스크롤 위치를 장수로 환산한다.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < count) setIndex(i);
  };

  return (
    <div>
      <div
        className="relative overflow-hidden bg-wabi-muted"
        role="group"
        aria-roledescription="carousel"
        aria-label={`${name} 사진`}
      >
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="relative aspect-square w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
            >
              <Image
                src={src}
                alt={i === 0 ? name : `${name} 사진 ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                preload={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* 품절을 상세에서도 한눈에(대표님) — 사진 위 오버레이. 목록 카드와 동일 톤.
            pointer-events-none 로 아래 스크롤·화살표 조작은 그대로 통과한다. */}
        {soldOut && (
          <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/65 text-lg tracking-wide text-wabi-fg backdrop-blur-[1px]">
            Out of Stock
          </span>
        )}

        {count > 1 && (
          <>
            {/* 화살표 — 44px 터치 타깃(모바일). 크림 바탕에 얇은 테두리로 사진을
                가리지 않게 최소한만. */}
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="이전 사진"
              className="absolute top-1/2 left-2 z-20 flex size-11 -translate-y-1/2 items-center justify-center border border-wabi-border bg-wabi-bg/70 text-wabi-fg transition-colors hover:bg-wabi-bg md:left-3"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="다음 사진"
              className="absolute top-1/2 right-2 z-20 flex size-11 -translate-y-1/2 items-center justify-center border border-wabi-border bg-wabi-bg/70 text-wabi-fg transition-colors hover:bg-wabi-bg md:right-3"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* 위치 표시 — 알약 점 대신 가는 선분(와비사비 톤). 눌러서 바로 그 장으로. */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번째 사진 보기`}
                aria-current={i === index ? "true" : undefined}
                className="group py-2"
              >
                <span
                  className={cn(
                    "block h-px w-6 transition-colors",
                    i === index
                      ? "bg-wabi-fg"
                      : "bg-wabi-border group-hover:bg-wabi-fg-muted",
                  )}
                />
              </button>
            ))}
          </div>
          <span
            aria-live="polite"
            className="font-numeric text-xs text-wabi-fg-muted"
          >
            {index + 1} / {count}
          </span>
        </div>
      )}
    </div>
  );
}

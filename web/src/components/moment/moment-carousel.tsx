"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// "오늘의 와비사비" 상세 사진 캐러셀 — 여러 장을 좌우로 넘겨 본다(인스타 피드식).
// 모바일 우선: scroll-snap 으로 스와이프가 자연스럽고, 데스크톱은 좌우 화살표·점으로
// 이동한다. 한 장이면 정적 이미지로 폴백. 외부 라이브러리 없이 자체 구현(CSP 안전).
export function MomentCarousel({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  if (count <= 1) {
    return (
      <div className="relative aspect-square overflow-hidden bg-wabi-muted">
        <Image
          src={images[0]}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          preload
        />
      </div>
    );
  }

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: el.clientWidth * clamped, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative aspect-square overflow-hidden bg-wabi-muted">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="relative h-full w-full shrink-0 snap-center"
          >
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              preload={i === 0}
            />
          </div>
        ))}
      </div>

      {/* 좌우 이동 — 데스크톱/키보드용(모바일은 스와이프) */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        aria-label="이전 사진"
        className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        disabled={index === count - 1}
        aria-label="다음 사진"
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* 현재/총 장수 */}
      <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 font-numeric text-xs text-white">
        {index + 1}/{count}
      </span>

      {/* 하단 점 인디케이터 */}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${i + 1}번째 사진 보기`}
            aria-current={i === index}
            className={`size-1.5 rounded-full transition ${
              i === index ? "bg-white" : "bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

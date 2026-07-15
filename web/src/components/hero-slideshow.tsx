"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// 홈 히어로 배경 슬라이드쇼 (#147). featured 상품 이미지를 크로스페이드로 순환.
// 장식용이라 aria-hidden. 이미지 1장 이하면 순환하지 않고, prefers-reduced-motion
// 이면 전환을 멈춰 첫 이미지만 고정한다(모션 민감 사용자 배려).
export function HeroSlideshow({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % images.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          preload={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* 크림 오버레이 — 배경 사진 위에서도 로고·텍스트가 선명하게 보이도록.
          위/아래를 살짝 더 덮어 헤더·버튼 영역의 대비를 확보한다. */}
      <div className="absolute inset-0 bg-gradient-to-b from-wabi-subtle/85 via-wabi-subtle/70 to-wabi-subtle/85" />
    </div>
  );
}

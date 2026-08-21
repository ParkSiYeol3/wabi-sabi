"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

// 상품 이미지 탭 확대(대표님/시열님) — 도자기는 질감·유약이 핵심이라 모바일에서
// 크게 봐야 한다. 탭하면 풀스크린 오버레이로 이미지를 크게 보여주고, 바깥 탭·ESC·
// 닫기 버튼으로 닫는다. next/image 프록시라 CSP·외부요청 변화 없음.
//
// 기존 레이아웃(히어로·스캐터 갤러리)의 `relative aspect-* overflow-hidden` 컨테이너
// 안에 그대로 넣으면 되도록 absolute inset-0 fill 로 렌더한다.
export function ProductImageZoom({
  src,
  alt,
  sizes,
  preload = false,
  imgClassName = "object-cover",
  natural = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  imgClassName?: string;
  // natural: 고정 비율 박스(fill·object-cover)가 아니라 원본 비율 그대로 렌더(대표님 —
  // 상세 갤러리 사진을 자르지 않음). 컨테이너에 aspect 가 없어도 이미지가 높이를 만든다.
  natural?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // 오버레이는 body 로 포털 — 히어로 컨테이너(변형/overflow 조상)에 fixed 가 갇혀
  // 화면 일부만 덮이는 문제 방지. open 은 초기 false·클릭 후에만 true 라 SSR/초기
  // 렌더에선 포털 분기가 실행되지 않아 document 접근이 없다(별도 mounted 가드 불요).

  // 오버레이 열릴 때 배경 스크롤 잠금 + ESC 로 닫기.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 확대해서 보기`}
        className={
          natural
            ? "group relative block w-full cursor-zoom-in"
            : "group absolute inset-0 cursor-zoom-in"
        }
      >
        {natural ? (
          // 원본 비율 — width/height 0 + h-auto 로 이미지의 자연 비율을 그대로 따른다.
          <Image
            src={src}
            alt={alt}
            width={0}
            height={0}
            sizes={sizes}
            preload={preload}
            className="h-auto w-full"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            preload={preload}
            className={imgClassName}
          />
        )}
        {/* 확대 가능 힌트 — 모바일은 은은히 항상, 데스크톱은 hover 시. */}
        <span className="pointer-events-none absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/35 text-white opacity-70 transition-opacity group-hover:opacity-100 md:opacity-0">
          <ZoomIn className="size-4" strokeWidth={1.75} />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} 확대 보기`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
          >
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            {/* 이미지 자체 클릭은 닫힘 방지 — 실수로 바로 닫히지 않게. */}
            <div
              className="relative h-[88vh] w-[92vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="92vw"
                className="object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

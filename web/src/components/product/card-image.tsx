"use client";

import Image from "next/image";
import { useState } from "react";

// 목록 카드 이미지 — next/image 최적화 엔드포인트(_next/image)가 특정(용량 큰) 이미지의
// 콜드 로드에서 간헐적으로 실패해 카드가 깨져 보이던 문제 대응. 상세 페이지는 다른
// sizes 로 이미 변형이 캐시돼 정상인데, 목록 카드용 변형이 콜드일 때만 깨지고 상세를
// 다녀오면 다시 보이던 증상이었다.
//
// onError(최적화 실패) 시 그 이미지만 unoptimized 로 전환해 Supabase 원본 URL 을 직접
// 로드한다(서버 최적화 우회 폴백). remotePatterns·CSP img-src 가 Supabase 호스트를
// 이미 허용하므로 그대로 뜬다. 정상 이미지는 기존처럼 최적화 경로를 탄다.
export function CardImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 50vw, 25vw"
      loading={eager ? "eager" : "lazy"}
      unoptimized={failed}
      onError={() => setFailed(true)}
      className="object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}

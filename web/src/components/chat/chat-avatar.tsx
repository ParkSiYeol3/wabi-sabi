"use client";

import Image from "next/image";
import { useState } from "react";
import { UserRound } from "lucide-react";

// 채팅 상담(#881) 상대 프로필 사진(카카오톡처럼 상대 쪽에만). 와비사비는 붓 마크,
// 회원은 프로필 사진(소셜 로그인 아바타), 없거나 못 불러오면 사람 아이콘.

export function BrandAvatar({ size = 36 }: { size?: number }) {
  const w = Math.round(size * 0.7);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border border-wabi-border bg-white"
    >
      <Image src="/brand/logo-mark.png" alt="" width={w} height={Math.round((w * 278) / 560)} />
    </span>
  );
}

export function PersonAvatar({ src, size = 36 }: { src: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover ring-1 ring-wabi-border"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-wabi-muted text-wabi-fg-muted"
    >
      <UserRound className="h-1/2 w-1/2" strokeWidth={1.5} />
    </span>
  );
}

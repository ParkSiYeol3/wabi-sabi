"use client";

import { useRef, useState } from "react";
import { Share2, Link2, Check, ExternalLink } from "lucide-react";

// 오늘의 와비사비 글 공유(대표님). 웹에서 인스타 스토리로 '자동 게시'는 불가(인스타
// 앱 전용 딥링크·FB 앱ID 필요) → 모바일 공유 시트(navigator.share)로 인스타·카톡·
// 네이버 등에 사용자가 직접 공유하게 한다. 데스크톱/미지원은 링크 복사로 폴백.
// 네이버 블로그는 공유 endpoint 로 바로 열어 준다.
export function MomentShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const currentUrl = () =>
    typeof window !== "undefined" ? window.location.href : "";

  async function share() {
    const url = currentUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // 사용자가 취소 — 조용히 무시
      }
      return;
    }
    // 공유 시트 미지원(데스크톱 등) → 링크 복사로 폴백
    await copy();
    close();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 차단(비보안 컨텍스트 등) — 무시
    }
  }

  function naverBlog() {
    const url = encodeURIComponent(currentUrl());
    const t = encodeURIComponent(title);
    window.open(
      `https://blog.naver.com/openapi/share?url=${url}&title=${t}`,
      "_blank",
      "noopener,noreferrer",
    );
    close();
  }

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-wabi-fg-muted transition-colors marker:content-none hover:text-wabi-fg">
        <Share2 className="size-4" strokeWidth={1.5} aria-hidden />
        공유
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-wabi-border bg-wabi-bg shadow-lg">
        <button
          type="button"
          onClick={share}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-wabi-fg transition-colors hover:bg-wabi-muted"
        >
          <Share2 className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          공유하기 (인스타·카톡 등)
        </button>
        <button
          type="button"
          onClick={naverBlog}
          className="flex w-full items-center gap-2 border-t border-wabi-border px-3 py-2.5 text-left text-sm text-wabi-fg transition-colors hover:bg-wabi-muted"
        >
          <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          네이버 블로그
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex w-full items-center gap-2 border-t border-wabi-border px-3 py-2.5 text-left text-sm text-wabi-fg transition-colors hover:bg-wabi-muted"
        >
          {copied ? (
            <Check className="size-4 shrink-0 text-wabi-accent" strokeWidth={1.5} aria-hidden />
          ) : (
            <Link2 className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          )}
          {copied ? "링크 복사됨" : "링크 복사"}
        </button>
      </div>
    </details>
  );
}

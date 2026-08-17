"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// 경량 토스트 — 화면 하단 중앙에 잠깐 떴다 자동으로 사라진다. 별도 provider 없이
// 부모가 message 를 들고 있다가 onClose 로 지운다(현재는 소셜 연결 실패 안내에 사용).
// 인라인 문구보다 눈에 띄고 흐름을 막지 않아, 리다이렉트 후 안내에 적합하다.
export function Toast({
  message,
  onClose,
  duration = 6000,
  tone = "error",
}: {
  message: string;
  onClose: () => void;
  duration?: number;
  tone?: "error" | "default";
}) {
  // 진입 애니메이션(마운트 직후 살짝 올라오며 페이드 인).
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const timer = setTimeout(onClose, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={[
          "pointer-events-auto flex max-w-md items-start gap-3 border-l-2 bg-wabi-fg px-4 py-3 text-sm text-white shadow-lg transition-all duration-300",
          tone === "error" ? "border-red-500" : "border-wabi-accent",
          shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        ].join(" ")}
      >
        <span className="leading-6">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mr-1 mt-0.5 shrink-0 text-white/55 transition hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

// 정식 오픈 준비중 안내 모달(대표님) — 토스 라이브·실상품·가격 확정 전, 손님이
// 결제를 시도했다 실패하지 않도록 사이트 진입 시 한 번 안내한다. 차단형이 아니다:
// "둘러보기"·바깥 클릭·ESC 로 닫으면 자유 열람이라 SEO·색인은 다치지 않는다
// (본문은 그대로 SSR 되고 오버레이만 위에 뜬다). 닫음은 세션 동안 유지.
// createPortal 로 body 에 붙여 변형·overflow 조상에 갇히지 않게 한다.

const DISMISS_KEY = "wasa_prep_dismissed";

export function PrepNotice({
  enabled,
  text,
}: {
  enabled: boolean;
  text: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 어드민·비활성 상태에선 아예 표시하지 않는다 — 렌더 가드로 처리해(setState 아님)
  // 이펙트가 상태를 되돌릴 필요가 없게 한다.
  const shouldShow = enabled && !pathname.startsWith("/admin");

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }, []);

  // 마운트 후, 세션에서 닫지 않았으면 연다. SSR HTML 엔 오버레이가 없어(크롤러는
  // 본문만 본다) 색인이 다치지 않는다.
  useEffect(() => {
    if (!shouldShow) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    // 마운트 후 세션 상태(외부 저장소)를 읽어 1회 표시하는 정당한 패턴 — 규칙은
    // 무한 캐스케이드 방지용 휴리스틱이라 여기선 예외.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [shouldShow]);

  // 열린 동안 배경 스크롤 잠금 + ESC 로 닫기.
  useEffect(() => {
    if (!open || !shouldShow) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, shouldShow, dismiss]);

  if (!open || !shouldShow) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prep-notice-title"
      onClick={dismiss}
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm border border-wabi-border bg-wabi-bg p-7 text-center shadow-xl"
      >
        <p className="[font-family:var(--font-cormorant),var(--font-maruburi),serif] text-2xl leading-none text-wabi-fg">
          わび-さび
        </p>
        <h2
          id="prep-notice-title"
          className="mt-3 text-lg font-medium text-wabi-fg"
        >
          정식 오픈 준비중입니다
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-wabi-fg-muted">
          {text}
        </p>
        <Button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          둘러보기
        </Button>
      </div>
    </div>,
    document.body,
  );
}

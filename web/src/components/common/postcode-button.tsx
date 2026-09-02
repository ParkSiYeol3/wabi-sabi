"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// 다음(카카오) 우편번호 검색 버튼 (대표님 — 배송지 주소 검색). 클릭하면 모달 레이어에
// 위젯을 embed 하고, 주소를 고르면 onComplete 로 우편번호·주소를 돌려준다. 상세주소만
// 사용자가 직접 입력한다. 팝업(.open) 대신 embed 레이어 방식 — 모바일 팝업 차단을 피하고
// 사이트 안에서 매끄럽게 닫힌다. CSP 는 next.config 의 POSTCODE_* 허용 참고.

export type PostcodeResult = {
  zonecode: string; // 5자리 새 우편번호
  address: string; // 사용자가 고른 유형(도로명/지번)의 기본 주소
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
};

type DaumPostcode = {
  embed: (el: HTMLElement, cfg?: { autoClose?: boolean }) => void;
};
type DaumPostcodeCtor = new (opts: {
  oncomplete: (data: PostcodeResult) => void;
  onclose?: () => void;
  width?: string;
  height?: string;
}) => DaumPostcode;

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeCtor };
  }
}

const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

// 스크립트는 페이지당 1회만 로드(프라미스 캐시). 실패 시 캐시를 비워 재시도 허용.
let loaderPromise: Promise<void> | null = null;
function loadPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.daum?.Postcode) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("우편번호 스크립트 로드 실패"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export function PostcodeButton({
  onComplete,
  className,
  children = "우편번호 찾기",
}: {
  onComplete: (r: PostcodeResult) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function handleClick() {
    setLoadError(false);
    try {
      await loadPostcodeScript();
      setOpen(true);
    } catch {
      setLoadError(true);
    }
  }

  // 모달이 열리고 스크립트가 준비되면 embed. open 이 바뀔 때마다 새 인스턴스를
  // 대상 div 에 그린다(다음 위젯은 재사용 대신 매번 embed 하는 게 안전).
  useEffect(() => {
    if (!open || !boxRef.current || !window.daum?.Postcode) return;
    const el = boxRef.current;
    el.innerHTML = "";
    new window.daum.Postcode({
      oncomplete: (data) => {
        onComplete(data);
        setOpen(false);
      },
      onclose: () => setOpen(false),
      width: "100%",
      height: "100%",
    }).embed(el, { autoClose: true });
  }, [open, onComplete]);

  // 모달 열림 동안 바디 스크롤 잠금 + Escape 닫기 + 포커스 복귀(a11y).
  // 위젯이 iframe 이라 포커스 트랩은 쓰지 않는다(주소 검색칸으로 Tab 이 들어가야 함).
  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      prevActive?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "shrink-0 whitespace-nowrap rounded-none border border-wabi-border px-4 text-sm text-wabi-fg-muted transition active:opacity-40 hover:border-wabi-fg hover:text-wabi-fg",
          className,
        )}
      >
        {children}
      </button>
      {loadError && (
        <p className="mt-1 text-xs text-red-700 sm:col-span-2">
          우편번호 검색을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="우편번호 검색"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-128 w-full max-w-lg flex-col border border-wabi-border bg-wabi-bg shadow-xl">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-wabi-border px-4">
              <span className="text-sm font-medium">우편번호 검색</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded-md p-1.5 text-wabi-fg transition-colors hover:bg-wabi-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            {/* 다음 위젯 embed 대상 */}
            <div ref={boxRef} className="min-h-0 flex-1" />
          </div>
        </div>
      )}
    </>
  );
}

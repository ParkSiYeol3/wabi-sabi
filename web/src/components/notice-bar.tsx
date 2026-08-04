"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, X } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";

// 상단 공지 바(대표님 — 공지가 푸터에만 있어 찾기 어려움). 최신 공지 제목을
// 헤더 위 얇은 띠로 노출해 "한 눈에" 보이게 한다. 홈(#197 곡선 무드 — 상단바
// 자체가 없음)·어드민(자체 셸)엔 노출하지 않는다. 스티키 헤더 위 일반 흐름이라
// 스크롤하면 바는 올라가고 헤더만 상단에 고정된다.
const DISMISS_KEY = "wabi-notice-dismissed";

export function NoticeBar({ id, title }: { id: string; title: string }) {
  const pathname = usePathname();
  // useSyncExternalStore 기반 — 서버=false, 클라 마운트 후=true. effect/setState
  // 없이 hydration 안전하게 "마운트 후" 를 안다.
  const mounted = useMounted();
  const [closed, setClosed] = useState(false);

  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  // 마운트 전(SSR·첫 클라 렌더)엔 항상 노출 → 서버/클라 일치. 마운트 후에만
  // localStorage 를 읽어 "이미 닫은 공지(같은 id)" 를 숨긴다. 닫기 기억은 id
  // 기준이라 새 공지(다른 id)가 오면 닫았어도 다시 보인다.
  const dismissed =
    closed || (mounted && localStorage.getItem(DISMISS_KEY) === id);
  if (dismissed) return null;

  return (
    <div className="w-full bg-wabi-fg text-wabi-bg">
      <div className="mx-auto flex h-10 max-w-300 items-center gap-2 px-5 text-xs">
        <Megaphone
          className="size-3.5 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        <Link
          href={`/notice/${id}`}
          className="min-w-0 flex-1 truncate tracking-wide hover:underline"
        >
          <span className="font-medium">[공지]</span> {title}
        </Link>
        <button
          type="button"
          aria-label="공지 닫기"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, id);
            setClosed(true);
          }}
          className="shrink-0 rounded p-1 transition-colors hover:bg-white/10"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

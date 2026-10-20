"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 서버 컴포넌트 화면을 몇 초마다 새로 그린다(탭이 보일 때만). 채팅 상담 목록(#881)처럼
// 새 항목이 들어오는 걸 열어 둔 채로 봐야 하는 관리자 화면용.
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, ms);
    return () => clearInterval(t);
  }, [ms, router]);
  return null;
}

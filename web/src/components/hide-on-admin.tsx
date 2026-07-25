"use client";

import { usePathname } from "next/navigation";

// 어드민(#238)은 자체 사이드바 셸을 쓰므로 사이트 푸터를 숨긴다. 서버 컴포넌트인
// SiteFooter 를 children 으로 받아 게이트만 담당한다(푸터 자체는 서버 렌더 유지).
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}

"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useMounted } from "@/hooks/use-mounted";

// 홈 CTA 아래 회색 로그인/회원가입(대표님) — 비로그인만.
// 서버 렌더(supabase.auth.getUser)로 판정하면 소셜 로그인 직후·클라 라우터
// 캐시로 로그인 상태를 놓쳐 로그인한 사용자에게도 노출되는 문제가 있었다.
// 그래서 푸터 LogoutButton 과 동일하게 클라이언트 스토어로 실시간 판정한다.
export function HomeAuthLinks() {
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);

  // 마운트 전(SSR)·로그인 상태면 렌더 안 함.
  if (!mounted || user) return null;

  return (
    <p className="mt-5 [font-family:var(--ws-mono)] text-[11px] tracking-[1px] text-[#423c30]/45">
      <Link
        href="/auth"
        className="underline-offset-4 transition-colors hover:text-[#423c30]/80 hover:underline"
      >
        로그인
      </Link>
      <span className="mx-2 text-[#423c30]/30">/</span>
      <Link
        href="/auth?tab=signup"
        className="underline-offset-4 transition-colors hover:text-[#423c30]/80 hover:underline"
      >
        회원가입
      </Link>
    </p>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Heart, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

// 모바일 하단 내비(대표님 — 마이페이지 바로가기 + 월간/오늘 등 어디서든 Shop 복귀).
// 홈(무드 페이지)·어드민에서는 숨긴다(헤더와 동일 규칙). 데스크톱은 헤더가 담당하므로
// md 이상 숨김. 로그인 여부는 스토어로 판정(마운트 전엔 /auth 로 폴백해 하이드레이션
// 불일치 방지).
export function MobileBottomNav() {
  const pathname = usePathname();
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);

  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  const myHref = mounted && user ? "/mypage" : "/auth";
  const tabs = [
    { href: "/", label: "홈", Icon: Home, active: false },
    {
      href: "/shop",
      label: "Shop",
      Icon: Store,
      active: pathname.startsWith("/shop"),
    },
    {
      href: "/mypage/wishlist",
      label: "찜",
      Icon: Heart,
      active: pathname.startsWith("/mypage/wishlist"),
    },
    {
      href: myHref,
      label: "마이",
      Icon: User,
      active:
        pathname === "/auth" ||
        (pathname.startsWith("/mypage") &&
          !pathname.startsWith("/mypage/wishlist")),
    },
  ];

  return (
    <nav
      aria-label="하단 내비게이션"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-wabi-border bg-wabi-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2.5 text-[10px] tracking-wide transition-colors",
            t.active ? "text-wabi-fg" : "text-wabi-fg-muted",
          )}
        >
          <t.Icon
            className="size-5"
            strokeWidth={t.active ? 2 : 1.6}
            aria-hidden
          />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

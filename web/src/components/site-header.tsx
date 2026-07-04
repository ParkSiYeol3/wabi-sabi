"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShoppingBag, User } from "lucide-react";
import { nav, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useCart, cartCount } from "@/store/cart";
import { useMounted } from "@/hooks/use-mounted";
import { useAuthStore } from "@/store/auth";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const count = useCart(cartCount);
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const accountHref = mounted && user ? "/mypage" : "/auth";
  const showAdmin = mounted && isAdmin;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-wabi-border bg-wabi-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-5">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} 홈`}>
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={560}
            height={278}
            priority
            className="h-6 w-auto"
          />
          <span className="text-sm font-bold tracking-[0.2em]">{site.name}</span>
        </Link>

        {/* 데스크톱 내비 */}
        <nav className="hidden md:flex md:items-center md:gap-10" aria-label="주요 메뉴">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm tracking-wide text-wabi-fg-muted transition-colors hover:text-wabi-fg"
            >
              {item.label}
            </Link>
          ))}
          {showAdmin && (
            <Link
              href="/admin"
              className="text-sm font-medium tracking-wide text-wabi-accent transition-colors hover:opacity-80"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* 우측 액션 */}
        <div className="flex items-center gap-1">
          <Link
            href="/cart"
            aria-label={`장바구니${mounted && count > 0 ? ` (${count}개)` : ""}`}
            className="relative rounded-md p-2 text-wabi-fg transition-colors hover:bg-wabi-muted"
          >
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {mounted && count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-wabi-accent px-1 text-[10px] leading-4 text-white">
                {count}
              </span>
            )}
          </Link>
          <Link
            href={accountHref}
            aria-label={mounted && user ? "마이페이지" : "로그인"}
            className="rounded-md p-2 text-wabi-fg transition-colors hover:bg-wabi-muted"
          >
            <User className="size-5" strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-wabi-fg transition-colors hover:bg-wabi-muted md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div
        className={cn(
          "overflow-hidden border-t border-wabi-border md:hidden",
          open ? "max-h-64" : "max-h-0 border-t-0",
          "transition-all duration-200",
        )}
      >
        <nav className="flex flex-col px-5 py-2" aria-label="모바일 메뉴">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="py-3 text-sm tracking-wide text-wabi-fg-muted transition-colors hover:text-wabi-fg"
            >
              {item.label}
            </Link>
          ))}
          {showAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-medium tracking-wide text-wabi-accent"
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

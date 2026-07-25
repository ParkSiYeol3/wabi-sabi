"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ChevronLeft } from "lucide-react";
import { ADMIN_NAV, activeLabel } from "./nav";
import { cn } from "@/lib/utils";

// 어드민 사이드바 — 데스크톱은 좌측 고정, 모바일은 상단바 + 슬라이드 오버레이.
// active 판정: /admin 은 정확히 일치할 때만(그 외 모든 페이지가 /admin 으로 시작),
// 나머지는 하위 경로(/admin/orders/[id])까지 startsWith 로 켠다.
function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6" aria-label="어드민 메뉴">
      {ADMIN_NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-3 text-[11px] font-medium tracking-wider text-wabi-fg-muted/70 uppercase">
            {group.heading}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((it) => {
              const active = isActive(pathname, it.href);
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-wabi-fg text-wabi-bg"
                        : "text-wabi-fg-muted hover:bg-wabi-muted hover:text-wabi-fg",
                    )}
                  >
                    <Icon
                      className="size-4 shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱 — 좌측 고정 사이드바 */}
      <aside className="hidden w-56 shrink-0 border-r border-wabi-border bg-wabi-subtle/60 md:block">
        <div className="sticky top-0 max-h-dvh overflow-y-auto p-4">
          <Link
            href="/"
            className="mb-6 flex items-center gap-2 px-3 py-1 text-sm font-semibold text-wabi-fg transition-colors hover:text-wabi-fg-muted"
          >
            <ChevronLeft className="size-4" />
            <span>
              WABI-SABI{" "}
              <span className="font-normal text-wabi-fg-muted">Admin</span>
            </span>
          </Link>
          <NavList />
        </div>
      </aside>

      {/* 모바일 — 상단바 + 슬라이드 오버레이 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between border-b border-wabi-border bg-wabi-subtle/60 px-4 py-3">
          <span className="text-sm font-semibold text-wabi-fg">
            {activeLabel(pathname)}
            <span className="ml-1.5 font-normal text-wabi-fg-muted">· Admin</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            className="rounded-lg p-1.5 text-wabi-fg transition-colors hover:bg-wabi-muted"
          >
            <Menu className="size-5" />
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 z-50">
            {/* 배경 오버레이 — 탭하면 닫힘 */}
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-wabi-footer/40"
            />
            <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] overflow-y-auto bg-wabi-bg p-4 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-wabi-fg"
                >
                  WABI-SABI{" "}
                  <span className="font-normal text-wabi-fg-muted">Admin</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="메뉴 닫기"
                  className="rounded-lg p-1.5 text-wabi-fg transition-colors hover:bg-wabi-muted"
                >
                  <X className="size-5" />
                </button>
              </div>
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

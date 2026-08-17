"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  User,
  Heart,
  Receipt,
  ChevronDown,
} from "lucide-react";
import { nav, site, MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery } from "@/lib/shop-url";
import { cn } from "@/lib/utils";
import { useCart, cartCount } from "@/store/cart";
import { useMounted } from "@/hooks/use-mounted";
import { useAuthStore } from "@/store/auth";

// 분류 라벨 — name_en 우선(대표님: shop 분류 영어), 비었거나 "-"(대분류
// TABLEWARE·OBJECTS)면 name_ko 폴백. shop-sidebar·mobile-category-tabs 와 동일 규칙.
function catLabel(n: { ko: string; en: string }) {
  const en = n.en?.trim();
  return en && en !== "-" ? en : n.ko;
}

export function SiteHeader({ tree }: { tree: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  // 모바일 드로어에서 SHOP 하위 분류 드롭다운 펼침 상태(대표님 — nav 라벨을 토글로).
  const [shopOpen, setShopOpen] = useState(false);
  // 어느 대분류를 펼쳤는지(아코디언 — 대표님: 대분류 누르면 그 소분류만 밑에 뜨게).
  // 한 번에 하나만 펼쳐 미니멀하게. null 이면 대분류 헤더만 보인다.
  const [openCat, setOpenCat] = useState<string | null>(null);
  // 아바타 로드 실패(호스트·만료 등) 시 기본 아이콘으로 폴백.
  const [avatarError, setAvatarError] = useState(false);
  // 드로어를 닫을 때는 펼쳐둔 분류도 함께 접어 다음에 열 때 깔끔하게 시작.
  const closeMenu = () => {
    setOpen(false);
    setShopOpen(false);
    setOpenCat(null);
  };
  const pathname = usePathname();
  const count = useCart(cartCount);
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  // 표시용 아바타는 profiles.avatar_url(고정값) — 세션 메타를 쓰면 같은 계정이라도
  // 로그인한 소셜(provider)에 따라 아바타가 바뀌어 흔들렸다(#0046). 스토어의
  // avatarUrl 은 AuthProvider 가 profiles 에서 읽어 채운다.
  const storedAvatar = useAuthStore((s) => s.avatarUrl);
  const accountHref = mounted && user ? "/mypage" : "/auth";
  const showAdmin = mounted && isAdmin;
  const avatarUrl = mounted && user ? storedAvatar : null;

  // 홈은 곡선만으로 시작하는 무드 페이지(#197 대표님 피드백) — 상단바 자체를 없앤다.
  // 탐색은 여정 끝 CTA(Shop)와 푸터가 담당한다.
  // 어드민(#238)은 자체 사이드바 셸을 쓰므로 사이트 헤더를 숨긴다.
  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-wabi-border bg-wabi-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-5">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} 홈`}>
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={560}
            height={278}
            preload
            className="h-6 w-auto"
          />
          {/* 로고 = Cormorant Garamond(대표님). 모바일에서 2줄로 줄바꿈되던 것 방지 */}
          <span className="whitespace-nowrap text-sm font-bold tracking-[0.2em] [font-family:var(--font-cormorant)]">
            {site.name}
          </span>
        </Link>

        {/* 데스크톱 내비 = Pretendard(대표님) */}
        <nav
          className="hidden md:flex md:items-center md:gap-10 [font-family:var(--font-pretendard)]"
          aria-label="주요 메뉴"
        >
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
          {/* 로그인 시 위시리스트·주문내역 바로가기(대표님 — 눈에 띄게 아이콘).
              모바일에선 공간이 좁아(로고 2줄) 상단에서 빼고 메뉴 안에 넣는다 → 데스크톱만. */}
          {mounted && user && (
            <>
              <Link
                href="/mypage/wishlist"
                aria-label="위시리스트"
                className="hidden rounded-md p-3 text-wabi-fg transition-colors hover:bg-wabi-muted md:inline-flex"
              >
                <Heart className="size-5" strokeWidth={1.5} />
              </Link>
              <Link
                href="/mypage/orders"
                aria-label="주문 내역"
                className="hidden rounded-md p-3 text-wabi-fg transition-colors hover:bg-wabi-muted md:inline-flex"
              >
                <Receipt className="size-5" strokeWidth={1.5} />
              </Link>
            </>
          )}
          <Link
            href="/cart"
            aria-label={`장바구니${mounted && count > 0 ? ` (${count}개)` : ""}`}
            className="relative rounded-md p-3 text-wabi-fg transition-colors hover:bg-wabi-muted"
          >
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {mounted && count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-wabi-accent px-1 font-numeric text-[10px] leading-4 text-white">
                {count}
              </span>
            )}
          </Link>
          <Link
            href={accountHref}
            aria-label={mounted && user ? "마이페이지" : "로그인"}
            className="rounded-md p-3 text-wabi-fg transition-colors hover:bg-wabi-muted"
          >
            {avatarUrl && !avatarError ? (
              <Image
                src={avatarUrl}
                alt=""
                width={28}
                height={28}
                sizes="28px"
                onError={() => setAvatarError(true)}
                className="size-7 rounded-full object-cover ring-1 ring-wabi-border"
              />
            ) : (
              <User className="size-5" strokeWidth={1.5} />
            )}
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            onClick={() => (open ? closeMenu() : setOpen(true))}
            className="rounded-md p-3 text-wabi-fg transition-colors hover:bg-wabi-muted md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
    </header>

      {/* 모바일 메뉴 — 오른쪽에서 밀려 나오는 드로어(대표님). 배경 딤 클릭 시 닫힘.
          헤더의 backdrop-blur 는 fixed 자식의 컨테이닝 블록이 돼 드로어를 헤더
          높이에 가둔다 → 드로어는 반드시 <header> 밖(형제)에 둔다.
          닫힘 상태는 화면 밖(translate-x-full)+pointer-events-none 로 아무것도 안 가린다. */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        {/* 딤 배경 */}
        <div
          onClick={closeMenu}
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        {/* 패널 */}
        <nav
          aria-label="모바일 메뉴"
          className={cn(
            "absolute right-0 top-0 flex h-full w-72 max-w-[82%] flex-col bg-wabi-bg shadow-xl transition-transform duration-200 [font-family:var(--font-pretendard)]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-wabi-border px-5">
            <span className="text-sm font-bold tracking-[0.2em] [font-family:var(--font-cormorant)]">
              {site.name}
            </span>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="메뉴 닫기"
              className="rounded-md p-2 text-wabi-fg transition-colors hover:bg-wabi-muted"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-col overflow-y-auto px-5 py-2">
            {nav.map((item) => {
              // SHOP 은 하위 분류(카테고리 트리)를 가진 토글(대표님 — nav 라벨을
              // 토글로, 클릭 시 하위 페이지가 아래로 펼쳐지는 드롭다운). 나머지
              // 라벨은 하위가 없어 그대로 링크. 분류를 이 드로어로 옮겨(대표님)
              // shop 본문에선 상품·정렬만 보이게 했다.
              const hasChildren = item.href === "/shop" && tree.length > 0;
              if (!hasChildren) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="py-3 text-sm tracking-wide text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => setShopOpen((v) => !v)}
                    aria-expanded={shopOpen}
                    className="flex w-full items-center justify-between py-3 text-sm tracking-wide text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200",
                        shopOpen && "rotate-180",
                      )}
                      strokeWidth={1.5}
                    />
                  </button>
                  {shopOpen && (
                    <div className="mb-1 flex flex-col pb-1 pl-3">
                      <Link
                        href="/shop"
                        onClick={closeMenu}
                        className="py-1.5 text-sm text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                      >
                        All
                      </Link>
                      {/* 월간 그릇·오늘의 와비사비 = 액센트로 강조(사이드바와 통일) */}
                      <Link
                        href={buildShopQuery({}, { category: MONTHLY_SLUG })}
                        onClick={closeMenu}
                        className="py-1.5 text-sm text-wabi-accent transition-colors hover:opacity-80"
                      >
                        월간 그릇
                      </Link>
                      <Link
                        href="/today"
                        onClick={closeMenu}
                        className="py-1.5 text-sm text-wabi-accent transition-colors hover:opacity-80"
                      >
                        오늘의 와비사비
                      </Link>
                      {/* 대분류 아코디언(대표님) — 대분류를 누르면 그 소분류만 밑에
                          작은 글씨로 펼쳐진다. 자식 없는 대분류는 그냥 링크. 펼친 뒤
                          '전체'로 그 대분류 전체보기 가능. */}
                      {tree.map((node) => {
                        const kids = node.children ?? [];
                        const catOpen = openCat === node.slug;
                        if (kids.length === 0) {
                          return (
                            <Link
                              key={node.slug}
                              href={buildShopQuery({}, { category: node.slug })}
                              onClick={closeMenu}
                              className="mt-2 block py-1.5 text-sm font-medium text-wabi-fg transition-colors"
                            >
                              {catLabel(node)}
                            </Link>
                          );
                        }
                        return (
                          <div key={node.slug} className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenCat(catOpen ? null : node.slug)
                              }
                              aria-expanded={catOpen}
                              className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-wabi-fg"
                            >
                              {catLabel(node)}
                              <ChevronDown
                                className={cn(
                                  "size-3.5 shrink-0 text-wabi-fg-muted transition-transform duration-200",
                                  catOpen && "rotate-180",
                                )}
                                strokeWidth={1.5}
                              />
                            </button>
                            {catOpen && (
                              <div className="flex flex-col pl-3">
                                <Link
                                  href={buildShopQuery({}, {
                                    category: node.slug,
                                  })}
                                  onClick={closeMenu}
                                  className="py-1 text-xs text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                                >
                                  All
                                </Link>
                                {kids.map((c) => (
                                  <Link
                                    key={c.slug}
                                    href={buildShopQuery({}, {
                                      category: c.slug,
                                    })}
                                    onClick={closeMenu}
                                    className="py-1 text-xs text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                                  >
                                    {catLabel(c)}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {showAdmin && (
              <Link
                href="/admin"
                onClick={closeMenu}
                className="py-3 text-sm font-medium tracking-wide text-wabi-accent"
                aria-label="관리자"
              >
                Admin
              </Link>
            )}
            {/* 로그인 시 위시리스트·주문내역 — 모바일은 상단 아이콘 대신 메뉴 안에(대표님). */}
            {mounted && user && (
              <>
                <div className="my-1 border-t border-wabi-border" />
                <Link
                  href="/mypage/wishlist"
                  onClick={closeMenu}
                  className="flex items-center gap-2 py-3 text-sm tracking-wide text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                >
                  <Heart className="size-4" strokeWidth={1.5} />
                  Wishlist
                </Link>
                <Link
                  href="/mypage/orders"
                  onClick={closeMenu}
                  className="flex items-center gap-2 py-3 text-sm tracking-wide text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                >
                  <Receipt className="size-4" strokeWidth={1.5} />
                  Orders
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}

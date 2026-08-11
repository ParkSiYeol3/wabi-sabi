import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// 모바일/태블릿 카테고리 — 분류를 전부 한눈에(대표님: 웹·모바일 모두 전 분류가
// 보이게, 알약 없이 텍스트만). 특수(전체·이 달·오늘의) 한 줄 + 대분류별로 그
// 소분류를 아래에 줄바꿈(wrap)해 나열한다. 누르면 그 분류 상품만 필터된다.
// 데스크톱은 좌측 사이드바(ShopSidebar) → 이 컴포넌트는 lg 미만만.

function Tab({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 text-sm leading-none transition active:opacity-40",
        active
          ? "font-semibold text-wabi-fg"
          : "text-wabi-fg-muted hover:text-wabi-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function MobileCategoryTabs({
  sp,
  tree,
  todayActive = false,
  tabletOnly = false,
}: {
  sp: ShopSP;
  tree: CategoryNode[];
  // /today 재사용 시 "오늘의 와비사비" 현재 위치 표시.
  todayActive?: boolean;
  // true 면 태블릿(md~lg)에서만 노출. 기본은 lg 미만 전부(모바일+태블릿).
  tabletOnly?: boolean;
}) {
  const current = sp.category;

  return (
    <div
      className={cn(
        "border-b border-wabi-border pb-4",
        tabletOnly ? "hidden md:block lg:hidden" : "lg:hidden",
      )}
    >
      <nav aria-label="카테고리" className="pt-1">
        {/* 특수 분류 — 전체·이 달의 상품·오늘의 와비사비 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Tab
            href={buildShopQuery(sp, { category: undefined })}
            active={!current && !todayActive}
          >
            전체
          </Tab>
          <Tab
            href={buildShopQuery(sp, { category: MONTHLY_SLUG })}
            active={current === MONTHLY_SLUG}
            className="text-wabi-accent hover:text-wabi-accent"
          >
            이 달의 상품
          </Tab>
          <Tab
            href="/today"
            active={todayActive}
            className="text-wabi-accent hover:text-wabi-accent"
          >
            오늘의 와비사비
          </Tab>
        </div>

        {/* 대분류(굵게=그룹 전체보기) — 지금 보고 있는 대분류의 소분류만 그 옆에
            줄바꿈 나열한다(대표님 — 그 대분류에 들어가면 상단에 대분류 + 그 소분류).
            나머지 대분류는 이름만. */}
        {tree.map((node) => {
          const children = node.children ?? [];
          const open =
            current === node.slug || children.some((c) => c.slug === current);
          return (
            <div
              key={node.slug}
              className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5"
            >
              <Tab
                href={buildShopQuery(sp, { category: node.slug })}
                active={current === node.slug}
                className="font-semibold"
              >
                {node.ko}
              </Tab>
              {open &&
                children.map((c) => (
                  <Tab
                    key={c.slug}
                    href={buildShopQuery(sp, { category: c.slug })}
                    active={current === c.slug}
                  >
                    {c.ko}
                  </Tab>
                ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

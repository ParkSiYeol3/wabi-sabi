import { Fragment } from "react";
import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// 모바일/태블릿 카테고리 — 한 줄 가로 스크롤 바(대표님: 좁은 화면에서 세로로 길면
// 상품이 첫 화면에 안 보임 → 상품을 곧바로 보이게 압축). 특수(전체·이 달·오늘의)
// 뒤에 대분류(굵게)+소분류를 순서대로 이어 붙이고, 그룹 사이는 세로선으로 나눈다.
// 좌우로 스와이프해 나머지 분류를 본다(오른쪽 페이드로 더 있음을 암시).
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
  // shop 페이지 전용(대표님): 모바일(<md)에선 분류를 우측 드로어로 옮기고 상품·정렬만
  // 보이게 하되, 드로어가 없는 태블릿(md~lg)에선 이 가로바를 그대로 남긴다.
  tabletOnly?: boolean;
}) {
  const current = sp.category;

  return (
    <div
      className={cn(
        "relative border-b border-wabi-border",
        tabletOnly ? "hidden md:block lg:hidden" : "lg:hidden",
      )}
    >
      <nav
        aria-label="카테고리"
        className="flex items-center gap-4 overflow-x-auto whitespace-nowrap pb-4 pr-9 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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

        {tree.map((node) => (
          <Fragment key={node.slug}>
            <span
              aria-hidden
              className="h-3 w-px shrink-0 bg-wabi-border"
            />
            {/* 대분류(굵게) = 그룹 전체보기 */}
            <Tab
              href={buildShopQuery(sp, { category: node.slug })}
              active={current === node.slug}
              className="font-medium"
            >
              {node.ko}
            </Tab>
            {(node.children ?? []).map((c) => (
              <Tab
                key={c.slug}
                href={buildShopQuery(sp, { category: c.slug })}
                active={current === c.slug}
              >
                {c.ko}
              </Tab>
            ))}
          </Fragment>
        ))}
      </nav>
      {/* 오른쪽 스크롤 힌트 페이드 — 더 있는 분류를 암시 */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 top-0 w-9 bg-gradient-to-l from-wabi-bg to-transparent"
      />
    </div>
  );
}

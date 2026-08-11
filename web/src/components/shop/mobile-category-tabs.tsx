import Link from "next/link";
import { type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// 분류 라벨 — 영어 이름(name_en) 우선(대표님: shop 분류 영어). 비었거나 "-"(대분류
// TABLEWARE·OBJECTS)면 name_ko 로 폴백.
function catLabel(n: CategoryNode) {
  const en = n.en?.trim();
  return en && en !== "-" ? en : n.ko;
}

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
  // 지금 보고 있는 대분류(그 대분류이거나 그 소분류를 볼 때). 있으면 대표님 지시대로
  // 그 대분류의 소분류만 보여준다 — 특수·다른 대분류는 감추고 '전체'로 돌아갈 길만 둔다.
  const activeParent = tree.find(
    (n) =>
      n.slug === current || (n.children ?? []).some((c) => c.slug === current),
  );

  return (
    <div
      className={cn(
        "mt-6 pb-4",
        tabletOnly ? "hidden md:block lg:hidden" : "lg:hidden",
      )}
    >
      <nav
        aria-label="카테고리"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1"
      >
        {activeParent ? (
          // 컨텍스트: All(전체 복귀) + 그 대분류의 소분류(영어). 대분류 헤더 없음.
          <>
            <Tab
              href={buildShopQuery(sp, { category: undefined })}
              active={false}
            >
              All
            </Tab>
            {(activeParent.children ?? []).map((c) => (
              <Tab
                key={c.slug}
                href={buildShopQuery(sp, { category: c.slug })}
                active={current === c.slug}
              >
                {catLabel(c)}
              </Tab>
            ))}
          </>
        ) : (
          // 기본: All + 대분류(TABLEWARE·OBJECTS). 이 달의 상품·오늘의 와비사비는
          // 모바일에선 우측 드로어(사이드바)로 뺐다(대표님).
          <>
            <Tab
              href={buildShopQuery(sp, { category: undefined })}
              active={!current && !todayActive}
            >
              All
            </Tab>
            {tree.map((node) => (
              <Tab
                key={node.slug}
                href={buildShopQuery(sp, { category: node.slug })}
                active={false}
                className="font-semibold"
              >
                {catLabel(node)}
              </Tab>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}

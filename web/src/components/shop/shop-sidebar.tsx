import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// 분류 라벨 — 영어 이름(name_en) 우선(대표님: shop 분류는 영어로). 비었거나 "-"
// (대표님이 비운 값 — 대분류 TABLEWARE·OBJECTS)면 name_ko 로 폴백한다.
function catLabel(n: CategoryNode) {
  const en = n.en?.trim();
  return en && en !== "-" ? en : n.ko;
}

// Shop 카테고리 사이드바 (#195). 대분류 헤더 + 그 아래 소분류. 데스크톱은 좌측
// 고정 열, 모바일은 shop 페이지의 "분류" 드롭다운 안에서 이 컴포넌트를 그대로
// 재사용한다(대표님 — 웹과 똑같은 그룹 방식으로 통일). 너비는 반응형.

function SideLink({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        // 누르면 살짝 흐려지는 press 피드백(대표님 — 눌렀는지 모르겠다). transition
        // 으로 색·투명도 함께 부드럽게. 선택된 항목은 진하게(font-medium+text-fg).
        "block py-1.5 text-sm transition active:opacity-40",
        active
          ? "font-medium text-wabi-fg"
          : "text-wabi-fg-muted hover:text-wabi-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function ShopSidebar({
  sp,
  tree,
  todayActive = false,
}: {
  sp: ShopSP;
  tree: CategoryNode[];
  // /today 에서 이 사이드바를 재사용할 때 "오늘의 와비사비"를 현재 위치로 표시.
  todayActive?: boolean;
}) {
  const current = sp.category;
  // 지금 보고 있는 대분류(그 대분류이거나 그 소분류를 볼 때). 있으면 대표님 지시대로
  // 그 대분류의 소분류만 보여준다 — 특수(전체·이 달·오늘의)와 다른 대분류는 감춘다.
  const activeParent = tree.find(
    (n) =>
      n.slug === current || (n.children ?? []).some((c) => c.slug === current),
  );

  return (
    <nav aria-label="카테고리" className="w-full lg:w-44 lg:shrink-0">
      {/* 카테고리 드릴다운(대표님) — 기본: All + 대분류(TABLEWARE·OBJECTS).
          대분류에 들어가면: All + 그 대분류의 소분류만. */}
      {activeParent ? (
        <div>
          <SideLink
            href={buildShopQuery(sp, { category: undefined })}
            active={false}
          >
            All
          </SideLink>
          {(activeParent.children ?? []).map((c) => (
            <SideLink
              key={c.slug}
              href={buildShopQuery(sp, { category: c.slug })}
              active={current === c.slug}
            >
              {catLabel(c)}
            </SideLink>
          ))}
        </div>
      ) : (
        <div>
          <SideLink
            href={buildShopQuery(sp, { category: undefined })}
            active={!current && !todayActive}
          >
            All
          </SideLink>
          {tree.map((node) => (
            <SideLink
              key={node.slug}
              href={buildShopQuery(sp, { category: node.slug })}
              active={false}
              className="font-medium"
            >
              {catLabel(node)}
            </SideLink>
          ))}
        </div>
      )}

      {/* 월간 그릇·오늘의 와비사비 — 카테고리가 아니라 특별 컬렉션. 데스크톱엔
          드로어가 없어 사이드바 하단에 항상 둔다(모바일은 드로어로 뺐다 — 대표님). */}
      <div className="mt-5 space-y-1 border-t border-wabi-border pt-4">
        <SideLink
          href={buildShopQuery(sp, { category: MONTHLY_SLUG })}
          active={current === MONTHLY_SLUG}
          className="text-wabi-accent hover:text-wabi-accent"
        >
          월간 그릇
        </SideLink>
        <SideLink
          href="/today"
          active={todayActive}
          className="text-wabi-accent hover:text-wabi-accent"
        >
          오늘의 와비사비
        </SideLink>
      </div>
    </nav>
  );
}

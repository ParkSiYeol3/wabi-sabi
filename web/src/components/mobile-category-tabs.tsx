import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// 모바일/태블릿 카테고리 — 드롭다운 대신 한눈에 보이는 플랫 탭바(대표님, Have Haus
// 참고 — 드롭다운은 직관성↓). 특수(전체·이 달·오늘의) + 대분류(굵게) + 소분류를
// 가운데 정렬로 줄바꿈해 흩어 놓는다. 선택 항목은 진하게+밑줄. 데스크톱은 좌측
// 사이드바(ShopSidebar)를 그대로 쓰므로 이 컴포넌트는 lg 미만에서만 노출.

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
        "text-sm leading-none transition active:opacity-40",
        active
          ? "font-semibold text-wabi-fg underline underline-offset-[6px]"
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
}: {
  sp: ShopSP;
  tree: CategoryNode[];
}) {
  const current = sp.category;

  return (
    <nav
      aria-label="카테고리"
      className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-b border-wabi-border pb-6 lg:hidden"
    >
      <Tab href={buildShopQuery(sp, { category: undefined })} active={!current}>
        전체
      </Tab>
      <Tab
        href={buildShopQuery(sp, { category: MONTHLY_SLUG })}
        active={current === MONTHLY_SLUG}
        className="text-wabi-accent hover:text-wabi-accent"
      >
        <span aria-hidden className="mr-0.5">
          ✦
        </span>
        이 달의 상품
      </Tab>

      {tree.map((node) => (
        <div key={node.slug} className="contents">
          {/* 대분류(굵게) = 그룹 전체보기 링크 */}
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
        </div>
      ))}

      <Tab href="/today" active={false} className="text-wabi-accent hover:text-wabi-accent">
        <span aria-hidden className="mr-0.5">
          ✦
        </span>
        오늘의 와비사비
      </Tab>
    </nav>
  );
}

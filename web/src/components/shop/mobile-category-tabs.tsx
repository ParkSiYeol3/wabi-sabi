import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// 모바일/태블릿 카테고리 — 드롭다운 대신 한눈에 보이는 구조화 탭(대표님). 세 묶음으로
// 정리한다: ① 특수(전체·이 달·오늘의) ② 대분류 TABLEWARE + 소분류(들여쓰기)
// ③ 대분류 OBJECTS + 소분류(들여쓰기). 좌측 정렬, 대분류 아래 소분류는 pl-4 로
// 들여쓴다. 선택 항목은 밑줄 없이 텍스트만 진하게(대표님). 데스크톱은 ShopSidebar.

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
}: {
  sp: ShopSP;
  tree: CategoryNode[];
}) {
  const current = sp.category;

  return (
    <nav
      aria-label="카테고리"
      className="mt-6 border-b border-wabi-border pb-6 lg:hidden"
    >
      {/* ① 특수 묶음 — 전체 · 이 달의 상품 · 오늘의 와비사비 */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Tab href={buildShopQuery(sp, { category: undefined })} active={!current}>
          전체
        </Tab>
        <Tab
          href={buildShopQuery(sp, { category: MONTHLY_SLUG })}
          active={current === MONTHLY_SLUG}
          className="text-wabi-accent hover:text-wabi-accent"
        >
          <span aria-hidden className="mr-0.5">
            ✧
          </span>
          이 달의 상품
        </Tab>
        <Tab
          href="/today"
          active={false}
          className="text-wabi-accent hover:text-wabi-accent"
        >
          <span aria-hidden className="mr-0.5">
            ✧
          </span>
          오늘의 와비사비
        </Tab>
      </div>

      {/* ②③ 대분류 묶음 — 헤더(굵게) + 소분류(들여쓰기) */}
      <div className="mt-4 space-y-4 border-t border-wabi-border pt-4">
        {tree.map((node) => (
          <div key={node.slug}>
            <Tab
              href={buildShopQuery(sp, { category: node.slug })}
              active={current === node.slug}
              className="font-medium"
            >
              {node.ko}
            </Tab>
            {node.children && node.children.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 pl-4">
                {node.children.map((c) => (
                  <Tab
                    key={c.slug}
                    href={buildShopQuery(sp, { category: c.slug })}
                    active={current === c.slug}
                  >
                    {c.ko}
                  </Tab>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

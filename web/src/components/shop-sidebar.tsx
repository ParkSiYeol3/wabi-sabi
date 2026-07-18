import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { categoryTree, MONTHLY_SLUG } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

// Shop 좌측 카테고리 사이드바 (#195, 대표님 피드백 — biomedium.kr 참고).
// 대분류 토글(details/summary — JS·라이브러리 없이 동작, CSP 무관) 아래 소분류.
// 현재 선택이 속한 대분류는 열린 상태로 렌더한다(open). 데스크톱(lg+) 전용 —
// 모바일은 페이지의 칩 2줄이 담당한다.

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
        "block py-1.5 text-sm transition-colors",
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

export function ShopSidebar({ sp }: { sp: ShopSP }) {
  const current = sp.category;

  return (
    <nav aria-label="카테고리" className="w-44 shrink-0">
      <SideLink href={buildShopQuery(sp, { category: undefined })} active={!current}>
        전체
      </SideLink>
      <SideLink
        href={buildShopQuery(sp, { category: MONTHLY_SLUG })}
        active={current === MONTHLY_SLUG}
      >
        이 달의 상품
      </SideLink>

      <div className="mt-3 space-y-1 border-t border-wabi-border pt-3">
        {categoryTree.map((node) =>
          node.children ? (
            <details
              key={node.slug}
              open={
                current === node.slug ||
                node.children.some((c) => c.slug === current)
              }
              className="group"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-1.5 text-sm text-wabi-fg-muted transition-colors hover:text-wabi-fg [&::-webkit-details-marker]:hidden">
                <span
                  className={cn(
                    (current === node.slug ||
                      node.children.some((c) => c.slug === current)) &&
                      "font-medium text-wabi-fg",
                  )}
                >
                  {node.ko}{" "}
                  <span className="text-xs text-wabi-fg-muted">{node.en}</span>
                </span>
                <ChevronDown
                  className="size-3.5 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="mb-1 border-l border-wabi-border pl-3">
                {/* 대분류 전체 보기(하위 포함 필터) */}
                <SideLink
                  href={buildShopQuery(sp, { category: node.slug })}
                  active={current === node.slug}
                >
                  {node.ko} 전체
                </SideLink>
                {node.children.map((c) => (
                  <SideLink
                    key={c.slug}
                    href={buildShopQuery(sp, { category: c.slug })}
                    active={current === c.slug}
                  >
                    {c.ko}
                  </SideLink>
                ))}
              </div>
            </details>
          ) : (
            <SideLink
              key={node.slug}
              href={buildShopQuery(sp, { category: node.slug })}
              active={current === node.slug}
            >
              {node.ko}{" "}
              <span className="text-xs text-wabi-fg-muted">{node.en}</span>
            </SideLink>
          ),
        )}
      </div>
    </nav>
  );
}

import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

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

export function ShopSidebar({
  sp,
  tree,
}: {
  sp: ShopSP;
  tree: CategoryNode[];
}) {
  const current = sp.category;

  return (
    <nav aria-label="카테고리" className="w-full lg:w-44 lg:shrink-0">
      <SideLink href={buildShopQuery(sp, { category: undefined })} active={!current}>
        전체
      </SideLink>
      {/* 이 달의 상품 — 특별 표시(대표님): 액센트 색 + 작은 마크로 큐레이션 강조 */}
      <SideLink
        href={buildShopQuery(sp, { category: MONTHLY_SLUG })}
        active={current === MONTHLY_SLUG}
        className="text-wabi-accent hover:text-wabi-accent"
      >
        <span aria-hidden className="mr-1">
          ✦
        </span>
        이 달의 상품
      </SideLink>

      {/* 오늘의 와비사비(자유게시판) — "이 달의 상품" 바로 아래(대표님). 이 달의
          상품과 같은 스타일로 통일(대표님) — 버튼이 아니라 같은 액센트 텍스트 링크. */}
      <SideLink
        href="/today"
        active={false}
        className="text-wabi-accent hover:text-wabi-accent"
      >
        <span aria-hidden className="mr-1">
          ✦
        </span>
        오늘의 와비사비
      </SideLink>

      {/* 대분류 그룹 — 두 그룹의 소분류를 항상 펼쳐 보여준다(대표님 — 대분류를
          먼저 고르지 않아도 소분류를 바로 선택). 대분류 헤더는 그 그룹 "전체보기"
          링크 역할(예: TABLEWARE 헤더 = 그릇류 전체). */}
      <div className="mt-4 space-y-3 border-t border-wabi-border pt-4">
        {tree.map((node) => (
          <div key={node.slug}>
            <SideLink
              href={buildShopQuery(sp, { category: node.slug })}
              active={current === node.slug}
              className="font-medium"
            >
              {node.ko}
              {/* 영문 부제는 값이 있을 때만 — 대분류 name_en 이 "-"(대표님이 비운
                  값)이면 "TABLEWARE -" 처럼 작대기만 남아 이를 숨긴다. */}
              {node.en && node.en.trim() && node.en.trim() !== "-" && (
                <span className="ml-1 text-xs text-wabi-fg-muted">
                  {node.en}
                </span>
              )}
            </SideLink>
            {node.children && node.children.length > 0 && (
              <div className="mb-1 border-l border-wabi-border pl-3">
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
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

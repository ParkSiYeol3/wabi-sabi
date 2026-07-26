import Link from "next/link";
import { MONTHLY_SLUG, type CategoryNode } from "@/lib/site";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import { CtaLink } from "@/components/cta-link";
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

export function ShopSidebar({
  sp,
  tree,
}: {
  sp: ShopSP;
  tree: CategoryNode[];
}) {
  const current = sp.category;
  // 대분류(또는 그 소분류)가 선택되면 그 대분류만 노출 — 다른 대분류는 통째로
  // 숨긴다(대표님 — TABLEWARE 선택 시 OBJECTS 안 보이게). 전체·이 달의 상품
  // 에선 둘 다 보여 대분류를 고를 수 있게 한다.
  const activeGroup = tree.find(
    (n) => n.slug === current || n.children?.some((c) => c.slug === current),
  );
  const visibleNodes = activeGroup ? [activeGroup] : tree;

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

      {/* 대분류 목록 — 선택된 대분류만 그 소분류를 펼친다(대표님). 별도의
          "[대분류] 전체" 링크는 없애고 대분류 헤더 자체가 그 대분류 전체 필터
          역할을 한다. 비활성 대분류는 헤더 링크만 보이고 소분류는 숨긴다. */}
      <div className="mt-3 space-y-1 border-t border-wabi-border pt-3">
        {visibleNodes.map((node) => {
          const childActive = !!node.children?.some((c) => c.slug === current);
          const groupActive = current === node.slug || childActive;
          return (
            <div key={node.slug}>
              <SideLink
                href={buildShopQuery(sp, { category: node.slug })}
                active={current === node.slug}
                className={cn(groupActive && "font-medium text-wabi-fg")}
              >
                {node.ko}{" "}
                <span className="text-xs text-wabi-fg-muted">{node.en}</span>
              </SideLink>
              {node.children && groupActive && (
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
          );
        })}
      </div>

      {/* 오늘의 와비사비(자유게시판) — 홈 Shop CTA 와 같은 채워지는 아웃라인
          버튼으로 소분류보다 눈에 띄게(대표님) */}
      <CtaLink href="/today" label="오늘의 와비사비" full className="mt-5" />
    </nav>
  );
}

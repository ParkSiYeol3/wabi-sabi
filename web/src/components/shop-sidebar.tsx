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

  return (
    <nav aria-label="카테고리" className="w-44 shrink-0">
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

      {/* 대분류 그룹 — 두 그룹의 소분류를 항상 펼쳐 보여준다(대표님 — 대분류를
          먼저 고르지 않아도 소분류를 바로 선택). 대분류 헤더는 그 그룹 "전체보기"
          링크 역할(예: TABLEWARE 헤더 = 그릇류 전체). */}
      <div className="mt-3 space-y-3 border-t border-wabi-border pt-3">
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

      {/* 오늘의 와비사비(자유게시판) — 홈 Shop CTA 와 같은 채워지는 아웃라인
          버튼으로 소분류보다 눈에 띄게(대표님) */}
      <CtaLink href="/today" label="오늘의 와비사비" full className="mt-5" />
    </nav>
  );
}

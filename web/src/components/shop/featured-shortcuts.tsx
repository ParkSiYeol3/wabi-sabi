import Link from "next/link";
import { buildShopQuery } from "@/lib/shop-url";
import { MONTHLY_SLUG } from "@/lib/site";
import { cn } from "@/lib/utils";

// 대표님: 월간 그릇·오늘의 와비사비가 우리 사이트의 특색 → 대분류로 승격해
// shop·showroom 등 여러 페이지 상단에 노출한다. 폭은 자연 폭(내용에 맞춤) — 모바일에서
// 전폭으로 늘리면(flex-1) 넓고 낮아 비정형 원이 얇아 보여, BackToShop 버튼처럼 통통한
// blob 이 되도록 넉넉한 패딩의 자연 폭 알약으로 통일(대표님). 드로어 SHOP 하위엔 없음.
const ITEMS = [
  { href: buildShopQuery({}, { category: MONTHLY_SLUG }), label: "월간 그릇" },
  { href: "/today", label: "오늘의 와비사비" },
] as const;

// 완벽한 원형 대신 불완전한 비정형 테두리(대표님 — 와비사비 미감). 손으로 빚은
// 듯 모서리 반경이 제각각인 유기적 형태. 두 버튼에 서로 다른 값을 줘 균질하지 않게.
const SHAPES = [
  "42% 58% 62% 38% / 55% 45% 55% 45%",
  "58% 42% 45% 55% / 45% 60% 40% 55%",
] as const;

export function FeaturedShortcuts({ className }: { className?: string }) {
  return (
    <nav aria-label="특색 메뉴" className={cn("flex gap-2.5 sm:gap-3", className)}>
      {ITEMS.map((it, i) => (
        <Link
          key={it.href}
          href={it.href}
          style={{ borderRadius: SHAPES[i % SHAPES.length] }}
          className="inline-flex items-center justify-center border border-wabi-fg/30 bg-wabi-bg px-4 py-2 text-center text-xs font-medium tracking-wide text-wabi-fg transition-colors hover:border-wabi-fg hover:bg-wabi-fg hover:text-wabi-bg sm:px-7 sm:py-2.5 sm:text-sm"
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

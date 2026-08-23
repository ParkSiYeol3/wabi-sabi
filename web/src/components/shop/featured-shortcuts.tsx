import Link from "next/link";
import { buildShopQuery } from "@/lib/shop-url";
import { MONTHLY_SLUG } from "@/lib/site";
import { cn } from "@/lib/utils";

// 대표님: 월간 그릇·오늘의 와비사비가 우리 사이트의 특색 → 대분류로 승격해
// shop·showroom 등 여러 페이지 상단에 크게 노출한다. 모바일은 두 버튼이 화면 폭을
// 나눠 채우고(flex-1), 데스크톱은 자연 폭. 드로어 SHOP 하위에서는 제거(중복 방지).
const ITEMS = [
  { href: buildShopQuery({}, { category: MONTHLY_SLUG }), label: "월간 그릇" },
  { href: "/today", label: "오늘의 와비사비" },
] as const;

export function FeaturedShortcuts({ className }: { className?: string }) {
  return (
    <nav
      aria-label="특색 메뉴"
      className={cn("flex gap-2.5 sm:gap-3", className)}
    >
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="flex flex-1 items-center justify-center rounded-full border border-wabi-fg/25 bg-wabi-bg px-4 py-2.5 text-center text-sm font-medium tracking-wide text-wabi-fg transition-colors hover:border-wabi-fg hover:bg-wabi-fg hover:text-wabi-bg sm:flex-none sm:px-6"
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

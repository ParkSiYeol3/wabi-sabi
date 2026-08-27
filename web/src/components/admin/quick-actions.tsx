import Link from "next/link";
import { ADMIN_NAV, type AdminNavItem } from "./nav";

// 대시보드 바로가기(대표님 — 사이드바 드로어를 열지 않고 대시보드에서 한 번에 이동).
// admin 진입 → 대시보드(운영 현황) → 여기서 원탭으로 자주 쓰는 섹션으로. 자주 쓰는
// 6개만: 상품·주문·매출·오늘의 와비사비·문의·리뷰. 라벨·아이콘은 사이드바 nav 재사용.
const QUICK_HREFS = [
  "/admin/products",
  "/admin/orders",
  "/admin/sales",
  "/admin/moments",
  "/admin/inquiries",
  "/admin/reviews",
] as const;

export function QuickActions() {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  const items = QUICK_HREFS.map((h) => all.find((it) => it.href === h)).filter(
    (it): it is AdminNavItem => !!it,
  );

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-wabi-border bg-wabi-bg/40 p-4 text-center shadow-sm transition active:scale-95 hover:border-wabi-fg hover:bg-wabi-muted/50"
          >
            <Icon className="size-6 text-wabi-fg" strokeWidth={1.6} aria-hidden />
            <span className="text-xs font-medium leading-tight text-wabi-fg">
              {it.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { ADMIN_NAV, type AdminNavItem } from "./nav";

// 대시보드 바로가기(대표님 — 사이드바 드로어를 열지 않고 대시보드에서 한 번에 이동).
// admin 진입 → 대시보드(운영 현황) → 여기서 원탭으로 자주 쓰는 섹션으로. 자주 쓰는
// 7개: 상품·주문·매출·회원 관리·문의·채팅 상담·리뷰. 라벨·아이콘은 사이드바 nav 재사용.
// (오늘의 와비사비 → 회원 관리, 대표님 2026-10-18. 오늘의 와비사비는 사이드바에 그대로.)
// 채팅 상담은 문의(게시판 글)와 따로 쌓이는 대화라 버튼을 따로 둔다(시열님 2026-10-22).
const QUICK_HREFS = [
  "/admin/products",
  "/admin/orders",
  "/admin/sales",
  "/admin/members",
  "/admin/inquiries",
  "/admin/chats",
  "/admin/reviews",
] as const;

export function QuickActions() {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  const items = QUICK_HREFS.map((h) => all.find((it) => it.href === h)).filter(
    (it): it is AdminNavItem => !!it,
  );

  return (
    // 휴대폰은 4개씩 두 줄(아랫줄 3개는 가운데), 컴퓨터는 한 줄 7칸.
    <div className="flex flex-wrap justify-center gap-2.5 sm:grid sm:grid-cols-7 sm:gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className="flex basis-[calc((100%-1.875rem)/4)] flex-col items-center justify-center gap-2 rounded-xl border border-wabi-border bg-wabi-bg/40 px-1 py-4 text-center shadow-sm transition active:scale-95 hover:border-wabi-fg hover:bg-wabi-muted/50 sm:p-4"
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

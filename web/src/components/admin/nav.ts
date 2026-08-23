import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tags,
  Megaphone,
  MessageCircle,
  Star,
  Camera,
  FileText,
  ScrollText,
  Bug,
  BarChart3,
  Users,
  Boxes,
} from "lucide-react";

// 어드민 내비게이션 단일 출처 — 사이드바(데스크톱·모바일)가 공유한다.
// group 으로 묶어 사이드바에 구분선을 넣는다: 운영(매일 보는 것) / 콘텐츠 / 로그.
export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  heading: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    heading: "운영",
    items: [
      { href: "/admin", label: "대시보드", icon: LayoutDashboard },
      { href: "/admin/products", label: "상품 관리", icon: Package },
      { href: "/admin/orders", label: "주문 관리", icon: ShoppingBag },
      { href: "/admin/categories", label: "카테고리", icon: Tags },
    ],
  },
  {
    heading: "분석",
    items: [
      { href: "/admin/sales", label: "매출·통계", icon: BarChart3 },
      { href: "/admin/inventory", label: "재고 관리", icon: Boxes },
      { href: "/admin/customers", label: "구매자 관리", icon: Users },
    ],
  },
  {
    heading: "고객",
    items: [
      { href: "/admin/inquiries", label: "문의", icon: MessageCircle },
      { href: "/admin/reviews", label: "리뷰", icon: Star },
      { href: "/admin/moments", label: "오늘의 와비사비", icon: Camera },
      { href: "/admin/notices", label: "공지", icon: Megaphone },
    ],
  },
  {
    heading: "운영 도구",
    items: [
      { href: "/admin/content", label: "콘텐츠", icon: FileText },
      { href: "/admin/audit", label: "감사로그", icon: ScrollText },
      { href: "/admin/errors", label: "에러로그", icon: Bug },
    ],
  },
];

// 현재 경로에 해당하는 내비 항목의 라벨 — 페이지 헤더 제목에 쓴다.
// 하위 경로(/admin/orders/[id])도 부모로 매칭하되, /admin 자기 자신은 정확히 일치할 때만.
export function activeLabel(pathname: string): string {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  const match = all
    .filter((it) =>
      it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href),
    )
    // 더 긴(구체적인) href 우선 — /admin/orders 가 /admin 보다 먼저.
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Admin";
}

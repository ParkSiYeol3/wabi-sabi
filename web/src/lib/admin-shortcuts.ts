import { ADMIN_NAV } from "@/components/admin/nav";

// 대시보드 바로가기(0084). 계정마다 고르고, 고르지 않았으면 기본값.
// 고를 수 있는 것은 사이드바 메뉴(대시보드 자신 제외)뿐이고 최대 8개
// (휴대폰 4칸 두 줄, 컴퓨터 한 줄).
export const SHORTCUT_MAX = 8;

export const DEFAULT_SHORTCUTS = [
  "/admin/products",
  "/admin/orders",
  "/admin/sales",
  "/admin/members",
  "/admin/inquiries",
  "/admin/chats",
  "/admin/reviews",
];

export const SHORTCUT_CHOICES = ADMIN_NAV.flatMap((g) => g.items).filter(
  (it) => it.href !== "/admin",
);

// 알 수 없는 경로·중복을 빼고 최대 개수로 자른다. 메뉴가 바뀌어 사라진 경로도 여기서 빠진다.
export function cleanShortcuts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(SHORTCUT_CHOICES.map((it) => it.href));
  const out: string[] = [];
  for (const h of raw) {
    if (typeof h === "string" && allowed.has(h) && !out.includes(h)) out.push(h);
  }
  return out.slice(0, SHORTCUT_MAX);
}

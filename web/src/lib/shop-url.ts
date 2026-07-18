// /shop 필터 URL 빌더 — 페이지(칩·정렬)와 사이드바가 공유한다 (#195).

export type ShopSP = { category?: string; q?: string; sort?: string };

export function buildShopQuery(base: ShopSP, override: Partial<ShopSP>): string {
  const merged = { ...base, ...override };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.q) params.set("q", merged.q);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  const s = params.toString();
  return s ? `/shop?${s}` : "/shop";
}

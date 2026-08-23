// /shop 필터 URL 빌더 — 페이지(칩·정렬)와 사이드바가 공유한다 (#195).

export type ShopSP = { category?: string; q?: string; sort?: string; page?: string };

export function buildShopQuery(base: ShopSP, override: Partial<ShopSP>): string {
  // page 는 base 에서 승계하지 않는다 — 카테고리·정렬·검색을 바꾸면 1페이지로 리셋되게.
  // 페이지 이동만 override.page 로 명시한다(없으면 undefined → 파라미터 생략).
  const merged = { ...base, ...override, page: override.page };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.q) params.set("q", merged.q);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  const s = params.toString();
  return s ? `/shop?${s}` : "/shop";
}

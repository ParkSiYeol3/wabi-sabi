// /search 주소 빌더. 검색어·필터·정렬을 주소에 담아 뒤로 가기·공유가 그대로 된다.

export type SearchSP = {
  q?: string;
  category?: string;
  price?: string;
  instock?: string;
  sort?: string;
  page?: string;
};

// page 는 base 에서 물려받지 않는다: 필터·정렬을 바꾸면 1페이지로 돌아간다(shop-url 과 같은 규칙).
export function buildSearchQuery(base: SearchSP, override: Partial<SearchSP>): string {
  const m = { ...base, ...override, page: override.page };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  if (m.category) p.set("category", m.category);
  if (m.price) p.set("price", m.price);
  if (m.instock === "1") p.set("instock", "1");
  if (m.sort && m.sort !== "relevance") p.set("sort", m.sort);
  if (m.page && m.page !== "1") p.set("page", m.page);
  const s = p.toString();
  return s ? `/search?${s}` : "/search";
}

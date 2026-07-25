// 상품 폼의 카테고리 선택지 — 등록·수정 페이지 공용.
// 상품은 소분류(잎)에만 연결한다(#193 2계층). 하위가 있는 대분류는 선택지에서
// 빼고, 소분류는 "대분류 > 소분류" 라벨로 어디 속하는지 보이게 한다.
// 하위 없는 대분류('선물')는 그대로 잎이다.

export type CategoryOption = { id: string; name_ko: string; name_en: string };
export type CategoryRow = CategoryOption & { parent_id: string | null };

export function leafCategoryOptions(rows: CategoryRow[]): CategoryOption[] {
  const parentIds = new Set(rows.map((c) => c.parent_id).filter(Boolean));
  const nameById = new Map(rows.map((c) => [c.id, c.name_ko]));
  return rows
    .filter((c) => !parentIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name_ko: c.parent_id
        ? `${nameById.get(c.parent_id)} > ${c.name_ko}`
        : c.name_ko,
      name_en: c.name_en,
    }));
}

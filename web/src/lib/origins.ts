// 상품 원산지 선택지 (대표님 지시 — "Made in ○○" 형식으로 통일).
// "Made in" 은 고정, 나라만 드롭다운으로 고른다. 저장값은 완성형 문자열
// ("Made in Korea")이라 상세 스펙 렌더는 값 그대로 표시하면 된다.
// 이 표만 고치면 등록·수정 폼 선택지와 검증이 함께 바뀐다.

export type Origin = { value: string; ko: string };

// 셀렉트숍 취급국 위주. 자주 쓰는 한국·일본을 위로.
export const ORIGINS: readonly Origin[] = [
  { value: "Made in Korea", ko: "대한민국" },
  { value: "Made in Japan", ko: "일본" },
  { value: "Made in China", ko: "중국" },
  { value: "Made in Taiwan", ko: "대만" },
  { value: "Made in Vietnam", ko: "베트남" },
  { value: "Made in Thailand", ko: "태국" },
  { value: "Made in France", ko: "프랑스" },
  { value: "Made in Germany", ko: "독일" },
  { value: "Made in Italy", ko: "이탈리아" },
  { value: "Made in Portugal", ko: "포르투갈" },
  { value: "Made in Denmark", ko: "덴마크" },
  { value: "Made in the UK", ko: "영국" },
  { value: "Made in the USA", ko: "미국" },
] as const;

const ORIGIN_VALUES = new Set(ORIGINS.map((o) => o.value));

export function isKnownOrigin(v: string): boolean {
  return ORIGIN_VALUES.has(v);
}

// 드롭다운 라벨 — "대한민국 (Made in Korea)"
export function originLabel(o: Origin): string {
  return `${o.ko} (${o.value})`;
}

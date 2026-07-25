// 상품 원산지 선택지 (대표님 지시 — "Made in ○○" 형식으로 통일).
// "Made in" 은 고정, 나라만 드롭다운으로 고른다. 저장값은 완성형 문자열
// ("Made in Korea")이라 상세 스펙 렌더는 값 그대로 표시하면 된다.
// 이 표만 고치면 등록·수정 폼 선택지와 검증이 함께 바뀐다.

export type Origin = { value: string; ko: string };

// 취급국(대표님) — 한·일·중만. 그 외는 폼에서 "직접 입력"으로 처리한다.
export const ORIGINS: readonly Origin[] = [
  { value: "Made in Korea", ko: "대한민국" },
  { value: "Made in Japan", ko: "일본" },
  { value: "Made in China", ko: "중국" },
] as const;

const ORIGIN_VALUES = new Set(ORIGINS.map((o) => o.value));

export function isKnownOrigin(v: string): boolean {
  return ORIGIN_VALUES.has(v);
}

// 드롭다운 라벨 — "대한민국 (Made in Korea)"
export function originLabel(o: Origin): string {
  return `${o.ko} (${o.value})`;
}

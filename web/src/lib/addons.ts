// 주문 추가 옵션(애드온) — 전역 공통, 주문 단위 (#250, 대표님 시안).
// 선물 포장·쇼핑백처럼 재고 없는 유료 서비스. 가격은 서버 진실(클라이언트가
// 준 값은 불신하고 여기 정가로 재계산한다). 대표님이 가격을 바꾸면 이 표만 수정.
//
// gift_wrap 은 기존 선물 포장(gift_options 의 메시지·보내는 분)과 연결된다 —
// 이 코드가 선택되면 checkout 이 메시지 입력을 함께 받는다.

export type Addon = {
  code: string;
  name: string;
  price: number;
  /** 선택 시 메시지·보내는 분 입력을 받는가(선물 포장 전용). */
  hasMessage?: boolean;
};

export const ADDONS: readonly Addon[] = [
  { code: "gift_wrap", name: "선물 포장", price: 4000, hasMessage: true },
  { code: "shopping_bag", name: "쇼핑백", price: 700 },
] as const;

const BY_CODE = new Map(ADDONS.map((a) => [a.code, a]));

export const GIFT_WRAP_CODE = "gift_wrap";
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 선택된 코드 목록 → 유효한 애드온만(알 수 없는 코드는 버림), 중복 제거.
export function resolveAddons(codes: readonly string[]): Addon[] {
  const seen = new Set<string>();
  const out: Addon[] = [];
  for (const code of codes) {
    if (seen.has(code)) continue;
    const a = BY_CODE.get(code);
    if (a) {
      seen.add(code);
      out.push(a);
    }
  }
  return out;
}

// 선택된 애드온 합계(서버 재계산용).
export function addonsTotal(codes: readonly string[]): number {
  return resolveAddons(codes).reduce((sum, a) => sum + a.price, 0);
}

// 주문에 저장할 스냅샷(가격·이름을 시점 고정).
export function addonSnapshot(
  codes: readonly string[],
): { code: string; name: string; price: number }[] {
  return resolveAddons(codes).map(({ code, name, price }) => ({
    code,
    name,
    price,
  }));
}

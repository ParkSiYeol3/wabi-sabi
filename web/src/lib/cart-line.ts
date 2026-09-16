import type { SelectedOption } from "@/lib/product-options";

// 장바구니 "줄"의 신원(#677). 같은 상품이라도 고른 옵션이 다르면 다른 줄이다.
//
// 대표님 제보: 블랙 1개·라임 1개를 담으면 "라임 2개"가 됐다. 줄을 상품 id 로만
// 구분해, 같은 상품이면 수량을 더하고 옵션은 마지막 것으로 덮어썼기 때문이다.
//
// ⚠ 클라이언트 store·서버 동기화(cart_items.line_key)·체크아웃 중복 판정이 **같은**
// 문자열을 만들어야 한다. 그래서 규칙을 여기 한 곳에만 둔다.
// 순서에 흔들리지 않게 옵션·애드온을 정렬한 뒤 잇는다(고른 순서는 신원이 아니다).
export function cartLineKey(
  productId: string,
  options: SelectedOption[] = [],
  addons: string[] = [],
): string {
  const o = [...options]
    .map((x) => `${x.name}=${x.value}`)
    .sort()
    .join("|");
  const a = [...addons].sort().join(",");
  return `${productId}::${o}::${a}`;
}

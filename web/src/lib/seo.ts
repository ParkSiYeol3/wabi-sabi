import type { Metadata } from "next";

// 없는 글·상품 페이지의 색인 차단.
//
// loading.tsx 가 있는 구간은 Next 가 뼈대를 먼저 흘려보내므로, 그 뒤에 부르는
// notFound() 는 상태코드를 못 바꾼다 — 응답은 이미 200 으로 나간 뒤다. 그래서
// 없는 상품 주소(/shop/아무거나)가 검색엔진에는 "정상 페이지"로 보인다.
// 상태코드를 되돌리려면 뼈대를 포기해야 하므로, 색인만 막는다.
export const NOINDEX: Metadata["robots"] = { index: false, follow: false };

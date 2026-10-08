// 주문 상태 라벨 (WSB-005)
export const ORDER_STATUS: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  // 화면 전용(0071) — DB status 는 paid 그대로, preparing_at 이 있으면 이 라벨.
  preparing: "상품 준비 중",
  shipping: "배송 중",
  delivered: "배송 완료",
  cancelled: "주문 취소",
};

// 화면에 보일 상태 — 결제 완료 뒤 대표님이 준비를 시작했으면(preparing_at) "상품 준비 중".
// 매출·통계는 DB status(paid)로 계속 센다(0071 주석 참고).
export function displayStatus(o: {
  status: string;
  preparing_at?: string | null;
}): string {
  return o.status === "paid" && o.preparing_at ? "preparing" : o.status;
}

export function statusLabel(status: string): string {
  return ORDER_STATUS[status] ?? status;
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 날짜 표기 (#124) — 서버 컴포넌트는 Vercel(UTC)에서 렌더된다. 시간대를 명시하지 않으면
// 서버 기준으로 날짜가 계산돼 KST 와 최대 9시간(=날짜 하루) 어긋난다. 수령일·청약철회
// 마감일은 법적 기산점이라 하루 오차가 곧 분쟁이 된다 → KST 고정.
export const KST = "Asia/Seoul";

export function formatDateKST(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: KST });
}

// 택배사 (#748 → #756). 처음엔 대표님이 우체국택배만 써서 하나로 고정했는데, 다른 택배사로
// 보내면 메일·조회 링크가 전부 우체국으로 갔다 → 주문마다 고른다(orders.courier, 0072).
// null(0072 이전 주문)은 우체국. 코드를 늘리면 0072 의 check 제약도 같이 고친다.
// 조회는 각 택배사 공식 조회 페이지 직링크(2026-10-03 네 곳 모두 링크의 번호로 바로 조회되는 것 확인).
// 숫자만 넘긴다(손님이 하이픈을 넣어도 동작). 목록에 없는 택배사는 "기타": 네이버 통합검색이
// 송장번호로 택배사를 찾아 조회 위젯을 띄운다(#240 방식).
const digits = (invoice: string) => encodeURIComponent(invoice.replace(/\D/g, ""));

type Courier = {
  // 메일·손님 화면에 쓰는 이름. 기타는 null(이름을 모른다).
  name: string | null;
  // 관리자 선택지 라벨
  label: string;
  trackUrl: (invoice: string) => string;
};

export const COURIERS = {
  epost: {
    name: "우체국택배",
    label: "우체국",
    trackUrl: (n) =>
      `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${digits(n)}`,
  },
  cj: {
    name: "CJ대한통운",
    label: "CJ대한통운",
    trackUrl: (n) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${digits(n)}`,
  },
  hanjin: {
    name: "한진택배",
    label: "한진",
    trackUrl: (n) =>
      `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${digits(n)}`,
  },
  lotte: {
    name: "롯데택배",
    label: "롯데",
    trackUrl: (n) =>
      `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${digits(n)}`,
  },
  logen: {
    name: "로젠택배",
    label: "로젠",
    trackUrl: (n) => `https://www.ilogen.com/web/personal/trace/${digits(n)}`,
  },
  etc: {
    name: null,
    label: "기타",
    trackUrl: (n) =>
      `https://search.naver.com/search.naver?query=${encodeURIComponent(`${n.trim()} 택배조회`)}`,
  },
} as const satisfies Record<string, Courier>;

export type CourierCode = keyof typeof COURIERS;
export const DEFAULT_COURIER: CourierCode = "epost";

export function isCourierCode(v: unknown): v is CourierCode {
  return typeof v === "string" && Object.hasOwn(COURIERS, v);
}

// 저장값 → 택배사. null·모르는 값은 우체국(0072 이전 주문).
export function courierOf(code: string | null | undefined): Courier {
  return COURIERS[isCourierCode(code) ? code : DEFAULT_COURIER];
}

export function trackingUrl(courier: string | null | undefined, invoice: string): string {
  return courierOf(courier).trackUrl(invoice);
}

// 주문 상품 표시 순서(#761). order_items 엔 담은 순서가 저장되지 않아 DB 가 돌려주는
// 순서가 매번 같다는 보장이 없다 → 금액(단가×수량) 큰 순. 요약의 대표 상품도 이 순서의 첫 번째.
export function byLineAmount<T extends { price: number; quantity: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.price * b.quantity - a.price * a.quantity);
}

// 청약철회 기간 — 수령일부터 7일 (교환·환불 안내 #106).
// 배송완료 확인 알림(#778): 발송 후 이 일수가 지나도 배송 중이면 관리자에게 알린다.
// 택배는 보통 1~2일이면 도착한다. 배송완료는 관리자가 눌러야만 바뀌어 잊기 쉽다.
export const DELIVERY_CHECK_DAYS = 3;

// 발송 후 지난 일수. shipped_at 이 없으면(0074 이전·송장 없이 배송 중) 주문 시각으로 본다.
export function daysSinceShipped(
  o: { shipped_at?: string | null; ordered_at: string },
  nowMs: number,
): number {
  return Math.floor((nowMs - Date.parse(o.shipped_at ?? o.ordered_at)) / 86_400_000);
}

// 발송 후 이 일수가 지나도 배송 중이면 배송 확인 크론이 배송완료로 바꾼다(#823).
// 택배사 조회로 확인할 수 없는 주문(기타 택배사·조회 키 없음·조회 실패)만. 조회가 "배송 중"
// 이라 답하면 분실·반송일 수 있어 두고 관리자가 본다. 쇼핑몰 플랫폼들의 시간 기준 안전망과 같다.
export const AUTO_DELIVER_DAYS = 10;

export const WITHDRAWAL_DAYS = 7;

export function withdrawalDeadlineKST(deliveredAt: string): string {
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + WITHDRAWAL_DAYS);
  return formatDateKST(d.toISOString());
}

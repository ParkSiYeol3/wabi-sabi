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

// 송장번호 배송조회 링크 (#240) — 어드민은 tracking_number 만 저장하고 택배사
// 컬럼이 없다(스키마 최소). 네이버 통합검색에 송장번호를 넘기면 택배사를 자동
// 감지해 조회 위젯을 띄우므로, 택배사 선택 없이 조회를 위임한다. 외부 링크(새 탭)라
// CSP frame/connect-src 와 무관하다.
export function trackingSearchUrl(invoice: string): string {
  const q = encodeURIComponent(`${invoice.trim()} 택배조회`);
  return `https://search.naver.com/search.naver?query=${q}`;
}

// 택배사 (#748) — 대표님은 우체국택배만 쓴다(2026-10-02 확인). 송장 칸에 택배사 선택이
// 없으므로 메일·안내는 이 값 하나를 본다. 택배사를 늘리면 orders 에 컬럼을 추가할 것.
// 조회는 우체국 공식 조회 페이지 직링크(숫자만 넘긴다 — 손님이 하이픈을 넣어도 동작).
export const COURIER = {
  name: "우체국택배",
  trackUrl: (invoice: string) =>
    `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(invoice.replace(/\D/g, ""))}`,
} as const;

// 청약철회 기간 — 수령일부터 7일 (교환·환불 안내 #106).
export const WITHDRAWAL_DAYS = 7;

export function withdrawalDeadlineKST(deliveredAt: string): string {
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + WITHDRAWAL_DAYS);
  return formatDateKST(d.toISOString());
}

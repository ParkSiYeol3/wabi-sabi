// 주문 상태 라벨 (WSB-005)
export const ORDER_STATUS: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  shipping: "배송 중",
  delivered: "배송 완료",
  cancelled: "주문 취소",
};

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

// 청약철회 기간 — 수령일부터 7일 (교환·환불 안내 #106).
export const WITHDRAWAL_DAYS = 7;

export function withdrawalDeadlineKST(deliveredAt: string): string {
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + WITHDRAWAL_DAYS);
  return formatDateKST(d.toISOString());
}

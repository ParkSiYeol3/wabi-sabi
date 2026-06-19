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

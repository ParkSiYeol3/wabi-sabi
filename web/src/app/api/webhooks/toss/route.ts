import { confirmPayment } from "@/lib/payments";

// 토스페이먼츠 웹훅 — 결제 상태 변경 수신.
// 사용자가 success 페이지로 돌아오지 못해도(브라우저 이탈 등) 주문이 확정되도록 보완.
// 페이로드는 신뢰하지 않는다: confirmPayment 가 토스 API(시크릿 키)로 재검증하므로
// 위조 요청은 승인/조회 단계에서 실패하고 상태 변경 없음.
// 등록: 토스 개발자센터 → 웹훅 → POST {배포도메인}/api/webhooks/toss (PAYMENT_STATUS_CHANGED)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // 이벤트 포맷: { eventType, data: { paymentKey, orderId, status, ... } } (구버전은 평면)
  const data = body?.data ?? body;
  const paymentKey: unknown = data?.paymentKey;
  const orderId: unknown = data?.orderId;
  const status: unknown = data?.status;

  if (typeof paymentKey !== "string" || typeof orderId !== "string")
    return Response.json({ ok: false, error: "invalid payload" }, { status: 400 });

  // 결제 완료 외 상태(취소·실패 등)는 여기서 처리하지 않음 — 200 으로 수신만 확인
  if (typeof status === "string" && status !== "DONE")
    return Response.json({ ok: true, skipped: status });

  const result = await confirmPayment(paymentKey, orderId);
  // 실패 시 4xx → 토스가 재시도
  return Response.json(result, { status: result.ok ? 200 : 422 });
}

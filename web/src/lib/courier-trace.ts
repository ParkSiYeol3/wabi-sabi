import "server-only";
import { epostConfigured, fetchEpostTrace, type ShipmentTrace } from "@/lib/epost-trace";
import { fetchSweetTrace, isSweetCourier, sweetConfigured } from "@/lib/sweettracker-trace";

// 택배사별 배송조회 한 곳(#818). 크론·관리자 조회 버튼·점검 주소가 같이 쓴다.
//   우체국(0072 이전 null 포함) → 우체국 공공 API, CJ·한진·롯데·로젠 → 스마트택배 API.
//   기타·키 없음 → 자동 조회 안 함(발송 3일 알림이 대신, #779).

export type TraceSource = "epost" | "sweettracker";

export function traceSource(courier: string | null | undefined): TraceSource | null {
  if (!courier || courier === "epost") return epostConfigured() ? "epost" : null;
  if (isSweetCourier(courier)) return sweetConfigured() ? "sweettracker" : null;
  return null;
}

export async function traceShipment(
  courier: string | null | undefined,
  invoice: string,
): Promise<ShipmentTrace> {
  const source = traceSource(courier);
  if (source === "epost") return fetchEpostTrace(invoice);
  if (source === "sweettracker" && isSweetCourier(courier)) return fetchSweetTrace(courier, invoice);
  return { kind: "error", message: "자동 조회를 지원하지 않는 택배사이거나 조회 키가 없습니다" };
}

import "server-only";
import { kstIso, type ShipmentTrace } from "@/lib/epost-trace";

// CJ대한통운·한진·롯데·로젠 배송조회(#818). 택배사 공식 무료 API 가 없어 조회 대행
// "스마트택배(스윗트래커) API" 를 쓴다. 우체국은 공공 API(epost-trace)를 그대로 쓴다.
//   GET https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key&t_code&t_invoice
//   오류: HTTP 400 + {status:false, code, msg} (키 없이 호출해 확인, 예 101 "키 정보를 찾을수 없습니다")
// 성공 응답은 키를 받은 뒤 실제로 확인한다. 우체국 때 문서와 다른 날짜 형식으로 배송완료를
// 놓쳤으므로(#803), 완료 판정과 시각 읽기를 여러 갈래로 받는다:
//   완료 = complete:true · level 6 · 처리현황(kind)이 "배달완료/배송완료" 로 시작 중 하나
//   시각 = 완료 기록의 timeString(현지 시각 문자열) 우선, 없으면 time(ms). 못 읽으면 확인 시각 + 원문.
// 무료 플랜은 같은 운송장 하루 10회 안내라 크론은 짝수 시각에만 부른다.

const ENDPOINT = "https://info.sweettracker.co.kr/api/v1/trackingInfo";

// 우리 택배사 코드 → 스마트택배 택배사 코드
export const SWEET_CODES = { cj: "04", hanjin: "05", logen: "06", lotte: "08" } as const;
export type SweetCourier = keyof typeof SWEET_CODES;

export function isSweetCourier(v: string | null | undefined): v is SweetCourier {
  return typeof v === "string" && Object.hasOwn(SWEET_CODES, v);
}

function apiKey(): string | null {
  return process.env.SWEETTRACKER_API_KEY?.trim() || null;
}

export function sweetConfigured(): boolean {
  return apiKey() !== null;
}

type Detail = { time?: unknown; timeString?: unknown; kind?: unknown; level?: unknown };

const kindOf = (d: Detail | undefined): string | null =>
  typeof d?.kind === "string" && d.kind.trim() ? d.kind.trim() : null;

const isDoneDetail = (d: Detail) =>
  Number(d.level) === 6 || /^(배달|배송)완료/.test((kindOf(d) ?? "").replace(/\s+/g, ""));

// 완료 기록의 시각. timeString 은 "2026-10-06 11:36:00" 같은 현지(KST) 문자열.
function detailIso(d: Detail | undefined): string | null {
  if (typeof d?.timeString === "string") {
    const [date, time] = d.timeString.trim().split(/\s+/);
    const at = kstIso(date ?? null, time ?? null);
    if (at) return at;
  }
  if (typeof d?.time === "number" && d.time > 1e12) return new Date(d.time).toISOString();
  return null;
}

// 응답 해석(테스트를 위해 따로 뺐다).
export function parseSweetTracker(json: unknown): ShipmentTrace {
  if (!json || typeof json !== "object") return { kind: "error", message: "응답 형식 오류" };
  const j = json as Record<string, unknown>;
  if (j.status === false) {
    return { kind: "error", message: `${j.code ?? "?"} ${j.msg ?? "조회 실패"}`.trim() };
  }
  const details = (Array.isArray(j.trackingDetails) ? j.trackingDetails : []) as Detail[];
  const doneIdx = details.findLastIndex(isDoneDetail);
  const delivered = j.complete === true || Number(j.level) === 6 || doneIdx >= 0;
  if (!delivered) {
    return {
      kind: "in_transit",
      last: kindOf(details.at(-1)) ?? kindOf(j.lastDetail as Detail | undefined),
    };
  }
  const done = doneIdx >= 0 ? details[doneIdx] : details.at(-1);
  const at = detailIso(done);
  if (at) return { kind: "delivered", deliveredAt: at };
  const raw = `${done?.timeString ?? ""} ${done?.time ?? ""}`.trim();
  return { kind: "delivered", deliveredAt: new Date().toISOString(), approx: raw || "없음" };
}

export async function fetchSweetTrace(
  courier: SweetCourier,
  invoice: string,
): Promise<ShipmentTrace> {
  const key = apiKey();
  if (!key) return { kind: "error", message: "SWEETTRACKER_API_KEY 미설정" };
  const t_invoice = invoice.replace(/\D/g, "");
  if (!t_invoice) return { kind: "error", message: "송장번호가 비었습니다" };
  try {
    const params = new URLSearchParams({ t_key: key, t_code: SWEET_CODES[courier], t_invoice });
    const res = await fetch(`${ENDPOINT}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    let json: unknown;
    try {
      json = JSON.parse(await res.text());
    } catch {
      return { kind: "error", message: `HTTP ${res.status}` };
    }
    return parseSweetTracker(json);
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "network error" };
  }
}

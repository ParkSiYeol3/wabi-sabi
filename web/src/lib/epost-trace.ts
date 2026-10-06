import "server-only";

// 우체국 배송조회(#791). 공공데이터포털 "우정사업본부_국내우편물 종적 조회 서비스"
// (getLongitudinalDomesticList, 자동승인). 응답은 XML:
//   cmmMsgHeader.successYN / returnCode / errMsg
//   dlvySttus(배달상태, 예 "배달완료") · dlvyDe(배달일자 yyyy.mm.dd)
//   기록마다 dlvyDate(yyyy.mm.dd) · dlvyTime(hh:mm) · nowLc · processSttus · detailDc
// 기록을 감싸는 요소 이름은 문서에 없어, 요소 이름에 기대지 않고 순서대로 읽는다.
// https 는 열려 있지 않다(443 거부) → http 엔드포인트.

const ENDPOINT =
  "http://openapi.epost.go.kr/trace/retrieveLongitudinalService/retrieveLongitudinalService/getLongitudinalDomesticList";

export type EpostTrace =
  // approx: 배달 시각을 읽지 못해 확인 시각으로 처리했을 때, 우체국이 준 날짜·시각 원문(로그용)
  | { kind: "delivered"; deliveredAt: string; approx?: string }
  | { kind: "in_transit"; last: string | null }
  | { kind: "error"; message: string };

// 서비스키는 포털의 "Decoding" 값을 넣는다. 실수로 Encoding 값(%2B 등)을 넣었으면 한 번 풀어
// 쓴다(URLSearchParams 가 다시 인코딩하므로 이중 인코딩이 되면 "등록되지 않은 서비스키").
function serviceKey(): string | null {
  const raw = process.env.EPOST_SERVICE_KEY?.trim();
  if (!raw) return null;
  return raw.includes("%") ? decodeURIComponent(raw) : raw;
}

export function epostConfigured(): boolean {
  return serviceKey() !== null;
}

// 값이 CDATA 로 감싸여 와도 같은 값으로 읽는다.
const inner = (raw: string) => raw.trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").trim();
const tag = (xml: string, name: string): string | null => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? inner(m[1]) : null;
};
const tags = (xml: string, name: string): string[] =>
  [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))].map((m) => inner(m[1]));

// 배달완료 판정. 처리현황은 "배달완료 ( 배달 )"·"배달완료(수령희망장소배달-...)"처럼 꼬리가
// 붙어 온다. 정확히 "배달완료"와 같을 때만 보던 탓에 첫 실주문(10/6 11:36 배달)을 배송 중으로
// 읽었다(#800). 공백을 빼고 앞머리로 본다.
const isDelivered = (s: string | null | undefined) =>
  (s ?? "").replace(/\s+/g, "").startsWith("배달완료");

// 날짜 + 시각 → KST ISO. 못 읽으면 null.
// 처음엔 문서대로 "2026.10.05" + "14:03" 만 읽었는데, 10/6 첫 실주문에서 배달완료 기록의
// 날짜를 못 읽어 배송 중으로 되돌아갔다(#803). 구분자와 자릿수에 기대지 않는다:
// 2026.10.06 · 2026-10-06 · 20261006 · 2026.10.6, 11:36 · 1136 · 11:36:00.
function kstIso(date: string | null, time: string | null): string | null {
  const d = date?.match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!d) return null;
  const [y, mo, da] = [d[1], d[2].padStart(2, "0"), d[3].padStart(2, "0")];
  if (+mo < 1 || +mo > 12 || +da < 1 || +da > 31) return null;
  const t = time?.replace(/\s/g, "").match(/^(\d{1,2}):?(\d{2})/);
  const hh = t ? t[1].padStart(2, "0") : "12";
  const mm = t ? t[2] : "00";
  const ms = Date.parse(`${y}-${mo}-${da}T${hh}:${mm}:00+09:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// 응답 XML 해석(테스트를 위해 따로 뺐다).
export function parseEpostTrace(xml: string): EpostTrace {
  if (tag(xml, "successYN") !== "Y") {
    return { kind: "error", message: `${tag(xml, "returnCode") ?? "?"} ${tag(xml, "errMsg") ?? "응답 오류"}`.trim() };
  }
  const dates = tags(xml, "dlvyDate");
  const times = tags(xml, "dlvyTime");
  const steps = tags(xml, "processSttus");
  // 배달완료 기록의 날짜·시각이 실제 수령 시각. 없으면 상단 배달일자(시각 모름 → 정오).
  const doneIdx = steps.findLastIndex(isDelivered);
  const delivered = isDelivered(tag(xml, "dlvySttus")) || doneIdx >= 0;
  if (delivered) {
    const at =
      (doneIdx >= 0 ? kstIso(dates[doneIdx] ?? null, times[doneIdx] ?? null) : null) ??
      kstIso(tag(xml, "dlvyDe"), null);
    if (at) return { kind: "delivered", deliveredAt: at };
    // 배달완료인데 시각을 못 읽었다. 배송 중으로 두면 영영 안 바뀌므로 확인 시각으로 처리하고
    // 원문을 남긴다(실제보다 최대 1시간 늦게 기록, 청약철회 기산은 손님에게 불리하지 않다).
    const raw = doneIdx >= 0 ? `${dates[doneIdx] ?? ""} ${times[doneIdx] ?? ""}` : (tag(xml, "dlvyDe") ?? "");
    return { kind: "delivered", deliveredAt: new Date().toISOString(), approx: raw.trim() || "없음" };
  }
  return { kind: "in_transit", last: steps.at(-1) ?? null };
}

export async function fetchEpostTrace(invoice: string): Promise<EpostTrace> {
  const key = serviceKey();
  if (!key) return { kind: "error", message: "EPOST_SERVICE_KEY 미설정" };
  const rgist = invoice.replace(/\D/g, "");
  if (rgist.length !== 13) return { kind: "error", message: "우체국 등기번호는 13자리" };
  try {
    const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ serviceKey: key, rgist })}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    return parseEpostTrace(await res.text());
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "network error" };
  }
}

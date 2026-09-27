import { sourceLabel } from "@/lib/traffic-source";

// 최근 방문자(오늘·어제, 0070) — "실제 손님이 오는지" 한눈에 보는 목록(시열님).
// 방문자 한 명(하루)에 한 줄. 판별은 셋:
//   봇 의심   자동화 프로그램 표시(navigator.webdriver)가 있었다
//   사람 확인 클릭·터치·키 입력을 했다
//   미확인    둘 다 아님 — 한 페이지만 보고 나갔거나 0070 이전 기록
// 개인을 알아볼 수 있는 정보는 없다(IP 미저장, 방문자 표시는 일일 해시 앞 6자리).

export type RecentVisitor = {
  visitor: string;
  day: string;
  first_at: string;
  last_at: string;
  views: number;
  source: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  lang: string | null;
  tz: string | null;
  automated: boolean;
  engaged: boolean;
};

// Vercel 이 주는 한국 지역 코드(ISO 3166-2:KR) → 이름. 강원·전북은 특별자치도 코드도 받는다.
const KR_REGION: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "50": "세종", "41": "경기", "42": "강원",
  "51": "강원", "43": "충북", "44": "충남", "45": "전북", "52": "전북",
  "46": "전남", "47": "경북", "48": "경남", "49": "제주",
};

const DEVICE: Record<string, string> = { mobile: "휴대폰", tablet: "태블릿", desktop: "PC" };

function place(v: RecentVisitor): string {
  if (!v.country) return "지역 정보 없음";
  if (v.country === "KR") {
    const region = v.region ? KR_REGION[v.region] ?? v.region : null;
    return [region, v.city].filter(Boolean).join(" ") || "국내";
  }
  return `해외 ${v.country}${v.city ? ` ${v.city}` : ""}`;
}

function time(v: RecentVisitor, today: string): string {
  const t = new Date(v.first_at).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return v.day === today ? t : `어제 ${t}`;
}

function verdict(v: RecentVisitor) {
  if (v.automated)
    return { label: "봇 의심", cls: "border-red-300 text-red-700" };
  if (v.engaged)
    return { label: "사람 확인", cls: "border-green-600/40 text-green-800" };
  return { label: "미확인", cls: "border-wabi-border text-wabi-fg-muted" };
}

export function RecentVisitors({
  rows,
  today,
}: {
  rows: RecentVisitor[];
  today: string;
}) {
  return (
    <ul className="divide-y divide-wabi-border">
      {rows.map((v) => {
        const vd = verdict(v);
        const device = v.device
          ? [DEVICE[v.device] ?? v.device, v.browser, v.os].filter(Boolean).join(" · ")
          : "기기 정보 없음(이전 기록)";
        const abroadTz = v.tz && v.tz !== "Asia/Seoul";
        return (
          <li
            key={`${v.day}-${v.visitor}`}
            className="flex items-start justify-between gap-3 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 text-wabi-fg">
                <span className="admin-numeric text-xs text-wabi-fg-muted">
                  {time(v, today)}
                </span>
                <span>{place(v)}</span>
              </p>
              <p className="mt-0.5 break-keep text-xs text-wabi-fg-muted">
                {device}
                {abroadTz ? ` · 시간대 ${v.tz}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-wabi-fg-muted">
                {v.source ? sourceLabel(v.source) : "유입 정보 없음"} ·{" "}
                <span className="admin-numeric">{v.views}</span>페이지
              </p>
            </div>
            <span
              className={`shrink-0 border px-2 py-0.5 text-[11px] ${vd.cls}`}
            >
              {vd.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

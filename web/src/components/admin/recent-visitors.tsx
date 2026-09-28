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

// 대시보드에서 그래프를 밀어내지 않게(시열님 2026-09-28) 기본은 최근 5명만, 나머지는
// 접어 둔다. 한 명 = 한 줄(좁은 화면은 두 줄).
const SHOWN = 5;

function Row({ v, today }: { v: RecentVisitor; today: string }) {
  const vd = verdict(v);
  const source = v.source ? sourceLabel(v.source) : "유입 정보 없음";
  // 인스타 앱 안에서 연 방문은 브라우저·유입이 둘 다 "인스타그램" — 한 번만 쓴다.
  const detail = [
    ...(v.device
      ? [DEVICE[v.device] ?? v.device, v.browser, v.os]
      : ["기기 정보 없음"]),
    v.tz && v.tz !== "Asia/Seoul" ? `시간대 ${v.tz}` : null,
    source === v.browser ? null : source,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex items-start gap-3 py-2 text-sm sm:items-center">
      {/* 좁은 화면: 시각·지역 한 줄 + 기기·유입 한 줄 / 넓은 화면: 시각 칸 고정, 한 줄 */}
      <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span className="admin-numeric shrink-0 text-xs text-wabi-fg-muted sm:w-[4.5rem]">
          {time(v, today)}
        </span>
        <span className="text-wabi-fg">{place(v)}</span>
        <span className="w-full break-keep text-xs text-wabi-fg-muted sm:w-auto">
          {detail} · <span className="admin-numeric">{v.views}</span>페이지
        </span>
      </p>
      <span className={`shrink-0 border px-2 py-0.5 text-[11px] ${vd.cls}`}>
        {vd.label}
      </span>
    </li>
  );
}

export function RecentVisitors({
  rows,
  today,
}: {
  rows: RecentVisitor[];
  today: string;
}) {
  const shown = rows.slice(0, SHOWN);
  const rest = rows.slice(SHOWN);
  return (
    <>
      <ul className="divide-y divide-wabi-border">
        {shown.map((v) => (
          <Row key={`${v.day}-${v.visitor}`} v={v} today={today} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="group border-t border-wabi-border">
          <summary className="cursor-pointer list-none py-2 text-xs text-wabi-fg-muted hover:text-wabi-fg [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              나머지 <span className="admin-numeric">{rest.length}</span>명 더 보기
            </span>
            <span className="hidden group-open:inline">접기</span>
          </summary>
          <ul className="divide-y divide-wabi-border border-t border-wabi-border">
            {rest.map((v) => (
              <Row key={`${v.day}-${v.visitor}`} v={v} today={today} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

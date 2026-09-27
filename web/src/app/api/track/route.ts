import { createHash } from "node:crypto";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { trafficSource } from "@/lib/traffic-source";
import { parseUserAgent } from "@/lib/user-agent";
import { createClient as createServerClient } from "@/lib/supabase/server";

// 방문 적재(0054) — VisitBeacon 이 경로 이동마다 sendBeacon/fetch 로 path 를 POST.
// 무인증 공개 엔드포인트라 log-error 와 같은 가드: content-type·크기·IP 레이트.
//
// 방문자 식별은 클라 localStorage 난수가 아니라 **서버측 일일 회전 해시**(Plausible 식).
// 카카오톡·인스타 등 인앱 브라우저는 열 때마다 localStorage 를 비워, 같은 사람이 링크를
// 여러 번 타면 매번 새 UUID 로 잡혀 순방문자가 크게 부풀려졌다(런칭일 1.4뷰/방문자).
// IP+UA 를 그날 KST 날짜로 해시하면 같은 기기·같은 하루는 한 방문자로 묶인다. 원본
// IP·UA 는 저장하지 않고 비가역 해시만 남기며(개인식별 불가), 하루가 지나면 해시가
// 바뀌어 지속 추적도 불가 — 쿠키·동의 배너 불필요.
const SALT = process.env.VISITOR_SALT || "wsv-visitor-salt-v1";

function visitorHash(ip: string, ua: string, day: string): string {
  return createHash("sha256")
    .update(`${SALT}|${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

// KST 날짜(YYYY-MM-DD) — 해시 소금과 저장 day 를 같은 경계로 맞춘다(자정 어긋남 방지).
function kstDay(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

// 봇 트래픽은 방문자 수를 부풀리므로 UA 로 걸러 낸다. 우리 E2E 스모크(WasaE2E)도
// 여기서 걸러진다 — 프로덕션을 그대로 돌기 때문에 안 거르면 머지할 때마다
// 방문자·장바구니·결제 수가 늘어난다(실제로 9/17~18 결제 조회 26건 중 대부분이 이것이었다). 실제 크롤러·프리뷰 스크레이퍼만
// 대상 — 카카오톡/인스타/라인 **인앱 브라우저는 실제 사람**이라 제외하지 않는다(그
// 과다 계상은 위 해시 방식으로 해소된다).
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|preview|scanner|monitor|uptime|lighthouse|pagespeed|ahrefs|semrush|mj12|dotbot|petalbot|applebot|yandex|baiduspider|duckduckbot|whatsapp|telegrambot|discordbot|slackbot|twitterbot|python-requests|axios|node-fetch|\bcurl\b|wget|go-http|okhttp|wasae2e/i;

// 짧은 문자열만 받는다 — 비콘 값은 무엇이든 보낼 수 있으니 길이·형식을 자른다.
function short(v: unknown, max = 40): string | null {
  return typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;
}

// Vercel 이 IP 로 추정해 붙여 주는 지역 — 도시 이름은 URL 인코딩돼 온다(0070).
// IP 자체는 저장하지 않는다(시열님 결정).
function geo(req: Request) {
  const h = (k: string) => {
    const v = req.headers.get(k);
    if (!v) return null;
    try {
      return decodeURIComponent(v).slice(0, 60);
    } catch {
      return v.slice(0, 60);
    }
  };
  return {
    country: h("x-vercel-ip-country"),
    region: h("x-vercel-ip-country-region"),
    city: h("x-vercel-ip-city"),
  };
}

// 관리자(대표님·시열님) 방문은 매장 통계에서 뺀다(0070, 시열님 결정). 로그인 쿠키가
// 있을 때만 서버에 확인한다 — 클라이언트도 알면 안 보내지만, 권한 정보가 늦게 붙는
// 첫 페이지까지 확실히 거르려면 여기서 한 번 더 본다.
async function isAdminVisit(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") || "";
  if (!/sb-[^=]*-auth-token/.test(cookie)) return false;
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string }>();
    return data?.role === "admin";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ct = (req.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (ct !== "application/json") return new Response(null, { status: 415 });

  // 프로덕션 도메인만 집계 — 프리뷰 배포(*.vercel.app)·로컬 요청은 무시한다.
  // 클라이언트 가드(VisitBeacon)와 이중 방어. 미들·프록시 뒤에서도 Host 는 실도메인.
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (host !== "wasa.kr") return new Response(null, { status: 204 });

  const ua = req.headers.get("user-agent") || "";
  if (BOT_RE.test(ua)) return new Response(null, { status: 204 });

  // IP 당 분 60건 — 정상 브라우징(경로 이동)은 훨씬 낮고, 남용 시 테이블 팽창 방지.
  const ip = clientIp(req);
  const { ok } = await rateLimit(`track:${ip}`, 60, 60);
  if (!ok) return new Response(null, { status: 429 });

  const raw = await req.text().catch(() => "");
  if (raw.length === 0 || raw.length > 1_024)
    return new Response(null, { status: 413 });

  let payload: {
    p?: unknown;
    r?: unknown;
    q?: unknown;
    l?: unknown; // 브라우저 언어
    z?: unknown; // 시간대
    w?: unknown; // navigator.webdriver(자동화 표시)
    e?: unknown; // 조작 신호 — 이 방문자가 클릭·터치·키 입력을 했다
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const path =
    typeof payload.p === "string" && payload.p.length > 0
      ? payload.p.slice(0, 200)
      : null;
  // 어드민 화면 방문은 매장 방문자 통계에 포함하지 않는다.
  if (path && path.startsWith("/admin"))
    return new Response(null, { status: 204 });

  if (!adminConfigured()) return new Response(null, { status: 204 });
  if (await isAdminVisit(req)) return new Response(null, { status: 204 });

  try {
    const day = kstDay();
    const admin = createAdminClient();
    const visitor = visitorHash(ip, ua, day);

    // 조작 신호 — 새 줄을 쌓지 않고, 이 방문자의 오늘 기록에 "사람이 조작함"을 표시한다.
    if (payload.e === 1) {
      await admin
        .from("page_views")
        .update({ engaged: true })
        .eq("visitor_id", visitor)
        .eq("day", day)
        .eq("engaged", false);
      return new Response(null, { status: 204 });
    }

    // 유입 라벨(0067). 비콘은 탭에서 **처음 한 번만** r 을 담아 보낸다 — 그 뒤의
    // 경로 이동은 r 자체가 없다. 없는 것과 빈 문자열은 뜻이 다르다:
    //   r 없음  = 사이트 안에서 옮긴 것 → 유입 아님(null)
    //   r = ""  = 주소 직접 입력·북마크 → direct
    // 이 구분을 안 하면 페이지를 옮길 때마다 '직접 방문'이 쌓인다.
    const entry = typeof payload.r === "string" || typeof payload.q === "string";
    const source = entry
      ? trafficSource(
          typeof payload.r === "string" ? payload.r : null,
          typeof payload.q === "string" ? payload.q : null,
        )
      : null;
    const { device, browser, os } = parseUserAgent(ua);
    await admin.from("page_views").insert({
      visitor_id: visitor,
      path,
      day,
      source,
      device,
      browser,
      os,
      lang: short(payload.l, 20),
      tz: short(payload.z, 40),
      automated: payload.w === true,
      ...geo(req),
    });
  } catch (e) {
    console.error("[track] 적재 실패", e);
  }
  return new Response(null, { status: 204 });
}

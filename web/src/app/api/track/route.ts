import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// 방문 적재(0054) — VisitBeacon 이 경로 이동마다 sendBeacon/fetch 로 POST.
// 무인증 공개 엔드포인트라 log-error 와 같은 가드: content-type·크기·IP 레이트.
// visitor_id 는 클라의 opaque 난수(개인식별 아님). admin 경로는 집계에서 제외.
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless/i;

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

  // 봇 트래픽은 방문자 수를 부풀리므로 UA 로 걸러 낸다(집계 정확도).
  if (BOT_RE.test(req.headers.get("user-agent") || ""))
    return new Response(null, { status: 204 });

  // IP 당 분 60건 — 정상 브라우징(경로 이동)은 훨씬 낮고, 남용 시 테이블 팽창 방지.
  const { ok } = await rateLimit(`track:${clientIp(req)}`, 60, 60);
  if (!ok) return new Response(null, { status: 429 });

  const raw = await req.text().catch(() => "");
  if (raw.length === 0 || raw.length > 1_024)
    return new Response(null, { status: 413 });

  let payload: { v?: unknown; p?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const visitorId =
    typeof payload.v === "string" && payload.v.length > 0
      ? payload.v.slice(0, 64)
      : null;
  if (!visitorId) return new Response(null, { status: 204 });

  const path =
    typeof payload.p === "string" && payload.p.length > 0
      ? payload.p.slice(0, 200)
      : null;
  // 어드민 화면 방문은 매장 방문자 통계에 포함하지 않는다.
  if (path && path.startsWith("/admin")) return new Response(null, { status: 204 });

  if (!adminConfigured()) return new Response(null, { status: 204 });

  try {
    const admin = createAdminClient();
    await admin.from("page_views").insert({ visitor_id: visitorId, path });
  } catch (e) {
    console.error("[track] 적재 실패", e);
  }
  return new Response(null, { status: 204 });
}

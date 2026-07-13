// CSP 위반 리포트 수집 (#58) — Report-Only 기간에 실사용자 브라우저가 보내는
// 위반을 Vercel 로그로 남긴다. 강제 전환 판단 근거(위반 0 확인)용.
// 브라우저가 report-uri(application/csp-report)·report-to(application/reports+json)
// 형식으로 자동 POST — 인증 없음이 정상.
// 무인증 공개 엔드포인트라 임의 POST 로 로그를 오염시킬 수 있음.
// 실제 CSP 리포트 content-type 만 수용해 잡음을 줄인다(브라우저가 보내는 값).
import { rateLimit, clientIp } from "@/lib/rate-limit";

const REPORT_TYPES = ["application/csp-report", "application/reports+json"];

export async function POST(req: Request) {
  const ct = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!REPORT_TYPES.includes(ct)) return new Response(null, { status: 415 });

  // IP 당 분 20건 — 한 페이지가 여러 위반을 동시에 보고할 수 있어 여유를 두되,
  // 무인증 엔드포인트라 로그 폭주(=Vercel 로그 비용)는 막는다.
  const { ok } = await rateLimit(`csp-report:${clientIp(req)}`, 20, 60);
  if (!ok) return new Response(null, { status: 429 });

  const body = await req.text().catch(() => "");
  // 로그 폭주 방지 — 비정상적으로 큰 페이로드는 버림
  if (body.length > 0 && body.length <= 16_384) {
    console.warn("[csp-report]", body);
  }
  return new Response(null, { status: 204 });
}

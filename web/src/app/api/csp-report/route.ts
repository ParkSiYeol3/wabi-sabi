// CSP 위반 리포트 수집 (#58) — Report-Only 기간에 실사용자 브라우저가 보내는
// 위반을 Vercel 로그로 남긴다. 강제 전환 판단 근거(위반 0 확인)용.
// 브라우저가 report-uri(application/csp-report)·report-to(application/reports+json)
// 형식으로 자동 POST — 인증 없음이 정상.
export async function POST(req: Request) {
  const body = await req.text().catch(() => "");
  // 로그 폭주 방지 — 비정상적으로 큰 페이로드는 버림
  if (body.length > 0 && body.length <= 16_384) {
    console.warn("[csp-report]", body);
  }
  return new Response(null, { status: 204 });
}

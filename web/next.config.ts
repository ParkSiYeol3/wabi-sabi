import type { NextConfig } from "next";

// 배포 환경(프리뷰/스테이징)별 Supabase 프로젝트 불일치 방지 — env 에서 파생.
// next.config 는 빌드 시 평가되므로 NEXT_PUBLIC_SUPABASE_URL 사용 가능.
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "zeqtfrwjnlckyinjxjcu.supabase.co";

// CSP (#58) — 2단계 강제(enforce). 1단계 Report-Only 관찰기간(07-05~) 위반 보고 없음
// + 실도메인 미연결(정식 배포 전)이라 전환 리스크 최소 시점에 전환.
// report-uri 는 유지 — 강제 후에도 위반이 /api/csp-report 로 계속 수집됨(안전망).
// 허용 근거: 토스 결제위젯(*.tosspayments.com — script/iframe/API/이미지),
// Supabase(REST·Storage·Realtime). 우편번호는 수동 입력이라 외부 스크립트 없음.
// script-src 'unsafe-inline' 은 Next.js 인라인 스크립트 필요 — nonce 전환 후속 검토.
//
// 지도 (#119) — 네이버 Maps JS SDK 가 CSP 관점에서 요구하는 것(전부 실측 확인):
//  ① SDK 본체·서브모듈: oapi.map.naver.com (script)
//  ② 지도 스타일 정의: nrbe.pstatic.net/styles/*.json 을 **JSONP 스크립트**로 로드한다 →
//     img-src 만 열면 타일이 한 장도 뜨지 않는다. script-src 에 *.pstatic.net 필요.
//  ③ 지오코딩(주소→좌표): maps.apigw.ntruss.com 에 JSONP 호출.
//  ④ 타일·마커 이미지: *.pstatic.net / *.map.naver.com / *.map.naver.net
// 구글 지도는 키 없는 iframe 임베드라 frame-src 만 필요하다(폴백 경로).
const MAP_SCRIPT =
  "https://oapi.map.naver.com https://maps.apigw.ntruss.com https://*.pstatic.net https://*.map.naver.net";
const MAP_ASSETS =
  "https://*.map.naver.com https://*.map.naver.net https://*.pstatic.net";
// SDK 자체 오류 수집 엔드포인트. 막아도 지도는 동작하지만 페이지를 볼 때마다 CSP 위반이
// 발생해 /api/csp-report 로그가 오염된다 → 허용해 잡음을 없앤다.
const MAP_TELEMETRY = "https://kr-col-ext.nelo.navercorp.com";
const MAP_FRAMES = "https://maps.google.com https://www.google.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://*.tosspayments.com ${MAP_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.tosspayments.com ${MAP_ASSETS}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.tosspayments.com ${MAP_SCRIPT} ${MAP_ASSETS} ${MAP_TELEMETRY}`,
  `frame-src https://*.tosspayments.com ${MAP_FRAMES}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // 위반 수집 — 콘솔만으론 실사용자(다양한 브라우저·기기) 위반을 놓침.
  // report-to(신규 Reporting API) + report-uri(레거시 폴백) 병행.
  "report-to csp",
  "report-uri /api/csp-report",
].join("; ");

// 보안 헤더 (보안_체크리스트 P1)
const securityHeaders = [
  // HTTPS 강제 (2년, 서브도메인 포함)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // 클릭재킹 차단 — 외부 사이트가 이 서비스를 iframe 에 넣지 못함
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 스니핑 차단
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부로 경로·쿼리 유출 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 미사용 브라우저 권한 차단 (결제 위젯은 payment 필요)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  // CSP 2단계 — 강제 적용 (위반 시 차단 + /api/csp-report 보고)
  { key: "Content-Security-Policy", value: csp },
  // CSP report-to 대상 엔드포인트 등록 (Reporting API)
  { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // 상품 이미지 업로드(서버 액션 FormData) — 기본 1MB → 다중 이미지 허용
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    // Supabase Storage 상품 이미지 허용 (next/image)
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
      },
      // 인스타그램 피드 이미지 (WSB-020) — IG CDN 은 지역별 서브도메인 가변.
      // next/image 가 서버에서 프록시하므로 CSP img-src 'self' 로 커버됨(추가 불필요).
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// 배포 환경(프리뷰/스테이징)별 Supabase 프로젝트 불일치 방지 — env 에서 파생.
// next.config 는 빌드 시 평가되므로 NEXT_PUBLIC_SUPABASE_URL 사용 가능.
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "zeqtfrwjnlckyinjxjcu.supabase.co";

// CSP (#58) — 1단계 Report-Only: 위반을 브라우저 콘솔로만 보고(차단 없음).
// 프로드에서 결제·이미지 업로드·OAuth 플로우 위반 0 확인 후 강제 전환(후속 PR).
// 허용 근거: 토스 결제위젯(*.tosspayments.com — script/iframe/API/이미지),
// Supabase(REST·Storage·Realtime). 우편번호는 수동 입력이라 외부 스크립트 없음.
// script-src 'unsafe-inline' 은 Next.js 인라인 스크립트 필요 — nonce 전환 후속 검토.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.tosspayments.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.tosspayments.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.tosspayments.com`,
  "frame-src https://*.tosspayments.com",
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
  // CSP 1단계 — 검증 완료 후 Content-Security-Policy 로 전환
  { key: "Content-Security-Policy-Report-Only", value: csp },
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
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// 보안 헤더 (보안_체크리스트 P1) — CSP 는 토스 위젯·Supabase 허용 목록 검증 후 별도 도입.
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
        hostname: "zeqtfrwjnlckyinjxjcu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

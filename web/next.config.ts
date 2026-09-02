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
// Supabase(REST·Storage·Realtime), 다음 우편번호(아래 POSTCODE_* 참고).
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

// 다음(카카오) 우편번호 서비스 (#… 배송지 주소 검색). CSP 관점 요구(로컬 실측 확인):
//  ① 위젯 로더 스크립트: t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
//  ② 검색 UI 는 embed 시 iframe 으로 삽입되는데, 카카오 리브랜딩으로 실제 프레임 도메인이
//     postcode.map.kakao.com 이다(옛 postcode.map.daum.net 도 폴백으로 함께 허용) → frame-src.
//  ③ 로더가 코드 조립에 eval 을 써서 script-src 에 'unsafe-eval' 이 없으면 위젯이 뜨지 않는다.
//     전역 완화가 부담이나 다음 우편번호의 요구라 불가피 — 대신 도메인은 최소로 좁힌다.
//  ④ 위젯 내부 리소스(주소검색 API·이미지)는 그 iframe(카카오 origin) 안에서 도므로 부모
//     CSP 무관. 로더가 부모에서 버전 체크 등 fetch 할 수 있어 connect 도 열어둔다.
const POSTCODE_SCRIPT = "https://t1.daumcdn.net";
const POSTCODE_FRAME =
  "https://postcode.map.kakao.com https://postcode.map.daum.net";

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' 은 다음 우편번호 로더(postcode.v2.js)가 코드 조립에 eval 을 써서
  // 불가피(없으면 위젯이 아예 안 뜬다). 도메인 화이트리스트는 최소로 유지.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.tosspayments.com ${MAP_SCRIPT} ${POSTCODE_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.tosspayments.com ${MAP_ASSETS}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.tosspayments.com ${MAP_SCRIPT} ${MAP_ASSETS} ${MAP_TELEMETRY} ${POSTCODE_SCRIPT}`,
  `frame-src https://*.tosspayments.com ${MAP_FRAMES} ${POSTCODE_FRAME}`,
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
  // Cross-Origin-Opener-Policy — cross-origin 문서가 window.opener 로 우리 창 핸들을
  // 잡아 조작(탭내빙)하거나 XS-leak 으로 상태를 훔치는 것을 차단. `same-origin` 은
  // 우리가 여는 팝업(토스 결제·소셜 OAuth 흐름)까지 격리해 postMessage 가 끊길 수
  // 있어, 팝업 통신은 살리고 opener 격리는 얻는 `same-origin-allow-popups` 를 쓴다.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // CSP 2단계 — 강제 적용 (위반 시 차단 + /api/csp-report 보고)
  { key: "Content-Security-Policy", value: csp },
  // CSP report-to 대상 엔드포인트 등록 (Reporting API)
  { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // /contact 를 소개(SHOWROOM)로 합침(0037, 대표님) — 기존 링크·북마크 영구 이전.
      { source: "/contact", destination: "/about", permanent: true },
      // 캐노니컬 강제: Vercel 배포 URL(wabi-sabi-nu.vercel.app)로 들어오면 정식
      // 도메인 wasa.kr 로 301. 네이버·구글이 vercel.app URL 을 색인·노출하던 문제
      // (검색 결과 링크가 vercel.app 로 뜸) 해소 — 도메인 하나로 통합(SEO·브랜드).
      {
        source: "/:path*",
        has: [{ type: "host", value: "wabi-sabi-nu.vercel.app" }],
        destination: "https://wasa.kr/:path*",
        permanent: true,
      },
    ];
  },
  // 상품 이미지 업로드(서버 액션 FormData) — 기본 1MB → 다중 이미지 허용
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    // AVIF 우선(WebP 폴백) — 모바일 셀룰러에서 이미지가 20~30% 더 작게 전송된다
    // (LCP·데이터 절약). 브라우저 협상으로 지원 시에만 AVIF, 아니면 WebP. Vercel Pro
    // 라 최적화 quota 여유(과거 무료 tier quota 소진 사고는 Pro 전환으로 해소).
    formats: ["image/avif", "image/webp"],
    // 최적화 이미지 캐시 수명 — 상품 사진은 자주 안 바뀌고 교체 시 URL 이 달라져
    // 캐시가 자연 무효화되므로 길게 잡아 재최적화 비용·지연을 줄인다(31일).
    minimumCacheTTL: 2678400,
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
      // 소셜 로그인 프로필 사진 — Google·Kakao 아바타 CDN(헤더 아바타).
      // next/image 프록시(same-origin)라 CSP img-src 'self' 로 커버되고,
      // http 소스도 프록시가 대신 받아 https 로 서빙하므로 혼합콘텐츠 없음.
      // 카카오 프로필 이미지는 http://*.kakaocdn.net 로 오는 경우가 있어 http 도 허용.
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.kakaocdn.net" },
      { protocol: "http", hostname: "*.kakaocdn.net" },
    ],
  },
};

export default nextConfig;

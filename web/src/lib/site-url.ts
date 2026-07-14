import "server-only";

// 사이트 절대 URL (#135) — sitemap·robots·OG·JSON-LD·메일 링크가 모두 이 값을 쓴다.
//
// wasa.kr 은 아직 **등록되지 않은 도메인**이다(2026-07-15 whois 확인). 그런데 코드가
// https://wasa.kr 을 하드코딩하고 있어서, 검색엔진에는 죽은 URL 을 제출하고 주문 확인
// 메일의 "주문 내역 보기" 링크는 접속 불가 사이트로 향했다.
//
// **서버 전용**(`server-only`): 폴백으로 쓰는 VERCEL_PROJECT_PRODUCTION_URL 은 서버에만
// 주입된다. 클라이언트 번들에서 이 모듈을 읽으면 그 값이 undefined 라 localhost 로
// 굳어버려(하이드레이션 불일치·잘못된 링크) 조용히 틀린다 → 임포트 자체를 막는다.
//
// 우선순위:
//   1) NEXT_PUBLIC_SITE_URL — 도메인을 확보하면 여기에 https://wasa.kr
//   2) VERCEL_PROJECT_PRODUCTION_URL — Vercel 이 주입하는 프로덕션 도메인(현 배포 주소)
//   3) localhost — 로컬 개발
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalize(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return normalize(vercel);

  return "http://localhost:3000";
}

// 프로토콜 없이 "wasa.kr" 만 넣는 실수가 잦다. 그대로 두면 layout 의 new URL(SITE_URL)
// 이 TypeError 로 터져 **앱 렌더링 전체가 중단**된다 → https 를 붙여 방어한다.
function normalize(value: string): string {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();

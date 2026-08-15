import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Serif_JP } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/account/auth-provider";
import { SessionTimeout } from "@/components/account/session-timeout";
import { NicknameGate } from "@/components/account/nickname-gate";
import { PrepNotice } from "@/components/layout/prep-notice";
import { getPrepNotice } from "@/lib/queries/content";
import { getCategoryTree } from "@/lib/queries/categories";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HideOnAdmin } from "@/components/layout/hide-on-admin";
import { SITE_URL } from "@/lib/site-url";
import { business } from "@/lib/site";

// 붓 획 느낌 + 얇고 가독성 좋은 명조로 통일(대표님 — Song Myung 은 두껍고
// 가독성↓). 한글=마루부리 Light(네이버, OFL — 붓 부리가 살아있는 얇은 명조,
// 전체 self-host, 한글 완성형 11172자 전부 커버), 라틴=Cormorant, 일본어
// 가나=Noto Serif JP 폴백. 스택 순서로 글자별 담당(라틴→Cormorant, 한글→마루부리,
// 가나→Noto Serif JP). 셀프호스팅이라 CSP·외부요청 없음.
const maruburi = localFont({
  src: "../fonts/MaruBuri-Light.woff2",
  weight: "300",
  variable: "--font-maruburi",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});
const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});
// 메뉴(내비) 산세리프는 globals.css 의 --font-pretendard(시스템 산세리프 스택)로 둔다.
// 과거 Noto Sans KR(next/font/google)을 썼으나 Google 이 subset woff2 를 갱신·삭제해
// gstatic 404 로 CI 빌드가 깨졌다 → 외부 폰트 의존 제거(메뉴는 대부분 라틴).

// 핀치 줌아웃(축소) 방지(#223 시열님) — 화면이 좁은 컬럼으로 줄어드는 현상 차단.
// 확대(zoom-in)는 그대로 허용해 저시력 접근성(WCAG 1.4.4)을 지킨다.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  // 모바일 브라우저 크롬(주소창·상태바)을 브랜드 크림으로 물들인다 — 사이트는
  // 다크모드 없이 항상 크림(#f3ebdd)이라 단일 색으로 충분(대표님 모바일 우선).
  themeColor: "#f3ebdd",
};

export const metadata: Metadata = {
  // SEO — 일반명사 "와비사비"는 경쟁이 심해 신규 도메인이 상위 노출되기 어렵다.
  // 제목·설명은 브랜드 멘트 톤(대표님 직접 작성). 지역명(천안·신부동)은 대표님
  // 요청으로 제외 — 브랜드·큐레이션 중심. 실제 주소는 아래 JSON-LD address·푸터에만.
  title: {
    default: "와비사비 WABI-SABI",
    template: "%s | 와비사비 WABI-SABI",
  },
  description:
    "와비사비는 순간의 아름다움보다 시간이 만들어내는 가치를 믿습니다. 매일 손이 가는 기물과 공간에 스며드는 오브제, 오래 곁에 두고 싶은 물건을 큐레이션합니다.",
  metadataBase: new URL(SITE_URL),
  // 아이콘은 관례 경로(public)로 clean URL 제공 — app/icon 규약은 해시 쿼리스트링
  // (?icon.<hash>)을 붙여 구글 파비콘 크롤러(/favicon.ico 우선)·iOS A2HS 가 종종
  // 무시하고 옛 캐시·og:image 로 폴백했다. /favicon.ico·/apple-touch-icon.png 를
  // 실제로 두고 여기서 clean 링크를 emit 한다.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title: "와비사비 WABI-SABI",
    description:
      "순간의 아름다움보다 시간이 만들어내는 가치를 믿는 곳. 오래 곁에 두고 싶은 기물과 오브제를 큐레이션합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "와비사비 WABI-SABI",
  },
  // 트위터/X 카드 — 링크 공유 시 큰 이미지 카드로 노출(og:image 폴백 사용).
  twitter: {
    card: "summary_large_image",
    title: "와비사비 WABI-SABI",
    description:
      "순간의 아름다움보다 시간이 만들어내는 가치를 믿는 곳. 오래 곁에 두고 싶은 기물과 오브제를 큐레이션합니다.",
  },
  // iOS "홈 화면에 추가" — standalone 실행 시 상단 제목·상태바 스타일.
  appleWebApp: {
    capable: true,
    title: "와비사비",
    statusBarStyle: "default",
  },
  // 검색엔진 소유확인 (SEO — 서치콘솔/서치어드바이저 등록). 각 콘솔에서 받은
  // content 값. google 은 metadata.verification.google 로 표준 emit, 네이버는
  // 전용 name 이라 other 로 넣는다(코드 받으면 naver-site-verification 추가).
  verification: {
    google: "-zsHZOqR95XLcbNQoCrlplHCip2X1cUnpBZH5BJ-hmA",
    other: {
      "naver-site-verification": "e801895dfeca654f8497e71965a8bfeee2bd2cb1",
    },
  },
};

// #16 SEO: 조직·사이트 구조화 데이터 — 검색 결과 브랜드 정보(정적 값만, 이스케이프 불필요).
const siteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "WABI-SABI 와비사비",
  alternateName: "와비사비 그릇 편집샵",
  description:
    "시간이 만들어내는 가치를 믿으며 오래 곁에 두고 싶은 기물과 오브제를 큐레이션합니다.",
  url: SITE_URL,
  // 브랜드 엔티티 연결 — 인스타그램
  sameAs: ["https://www.instagram.com/wasa.kr"],
  // 값이 있을 때만 — 미입력 필드는 넣지 않는다(허위 표시 방지, undefined 는 제거됨).
  telephone: business.phone || undefined,
  email: business.email || undefined,
  address: {
    "@type": "PostalAddress",
    streetAddress: "대흥로 338 1층 2호",
    addressLocality: "천안시 동남구",
    addressRegion: "충남",
    postalCode: "31122",
    addressCountry: "KR",
  },
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 정식 오픈 준비중 안내(대표님) — 전역 마운트로 홈뿐 아니라 검색·링크로 상품
  // 페이지에 바로 들어온 손님도 결제 전에 안내를 본다. 캐시된 조회라 TTFB 영향 미미.
  // 카테고리 트리는 모바일 드로어의 SHOP 분류 드롭다운용(대표님) — 병렬 조회.
  const [prepNotice, tree] = await Promise.all([
    getPrepNotice(),
    getCategoryTree(),
  ]);
  return (
    <html
      lang="ko"
      className={`${cormorant.variable} ${maruburi.variable} ${notoSerifJp.variable} h-full antialiased`}
    >
      {/* 스티키 푸터 — 뷰포트 기준 min-h-dvh 로 본문이 짧거나 로딩 중이어도 항상
          화면을 채워, 긴 푸터가 헤더 밑으로 올라와 화면을 덮는 버그를 막는다.
          (기존 html.h-full→body.min-h-full 높이 체인은 로딩·CSS 적용 타이밍에
          접혀 main.flex-1 이 안 채워지는 순간이 있었다. #shop 모바일 첫 진입 버그) */}
      <body className="flex min-h-dvh flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
        <AuthProvider>
          {/* 로그인 지속시간 제한(미활동 30분·절대 7일) — 개인정보보호 정책 */}
          <SessionTimeout />
          {/* 가입 후 닉네임 설정 모달(실명 노출 방지) */}
          <NicknameGate />
          {/* 정식 오픈 준비중 안내(대표님 어드민 on/off) — 어드민 경로 제외는 내부 판정 */}
          <PrepNotice enabled={prepNotice.enabled} text={prepNotice.text} />
          {/* 키보드 사용자용 본문 바로가기 (a11y) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-wabi-fg focus:px-4 focus:py-2 focus:text-sm focus:text-white"
          >
            본문으로 건너뛰기
          </a>
          <SiteHeader tree={tree} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <HideOnAdmin>
            <SiteFooter />
          </HideOnAdmin>
        </AuthProvider>
      </body>
    </html>
  );
}

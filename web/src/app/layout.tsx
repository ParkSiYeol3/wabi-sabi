import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Serif_JP } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HideOnAdmin } from "@/components/hide-on-admin";
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

// 핀치 줌아웃(축소) 방지(#223 시열님) — 화면이 좁은 컬럼으로 줄어드는 현상 차단.
// 확대(zoom-in)는 그대로 허용해 저시력 접근성(WCAG 1.4.4)을 지킨다.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "WABI-SABI [わび-さび] — Living Select Shop",
    template: "%s | WABI-SABI",
  },
  description:
    "불완전함의 아름다움. 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를 큐레이션합니다. Tableware · Objects · Craft · Gifts",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "WABI-SABI [わび-さび]",
    description: "불완전함의 아름다움 — 수공예 도자기·생활 오브제 셀렉트샵",
    type: "website",
    locale: "ko_KR",
  },
};

// #16 SEO: 조직·사이트 구조화 데이터 — 검색 결과 브랜드 정보(정적 값만, 이스케이프 불필요).
const siteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "WABI-SABI 와비사비",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${cormorant.variable} ${maruburi.variable} ${notoSerifJp.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
        <AuthProvider>
          {/* 키보드 사용자용 본문 바로가기 (a11y) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-wabi-fg focus:px-4 focus:py-2 focus:text-sm focus:text-white"
          >
            본문으로 건너뛰기
          </a>
          <SiteHeader />
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

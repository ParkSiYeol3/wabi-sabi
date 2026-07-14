import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_URL } from "@/lib/site";

// 본문/제목 — Pretendard 대체 (추후 Pretendard 로컬폰트로 교체 가능)
const notoSansKr = Noto_Sans_KR({
  variable: "--font-pretendard",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// わび-さび 브랜드 액센트 (명조)
const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

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
  sameAs: ["https://www.instagram.com/wasa.kr"],
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
      className={`${notoSansKr.variable} ${notoSerifJp.variable} h-full antialiased`}
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
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}

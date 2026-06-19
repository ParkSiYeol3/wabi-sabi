import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
  metadataBase: new URL("https://wasa.kr"),
  openGraph: {
    title: "WABI-SABI [わび-さび]",
    description: "불완전함의 아름다움 — 수공예 도자기·생활 오브제 셀렉트샵",
    type: "website",
    locale: "ko_KR",
  },
};

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
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}

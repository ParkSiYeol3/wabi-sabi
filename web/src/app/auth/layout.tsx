import type { Metadata } from "next";

// page.tsx 가 "use client" 라 metadata 를 내보낼 수 없어 레이아웃에서 제공한다.
// 페이지별 <title> 은 WCAG 2.4.2(페이지 제목) — 탭·히스토리·스크린리더 식별용.
export const metadata: Metadata = {
  title: "로그인",
  description: "WABI-SABI 로그인·회원가입",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

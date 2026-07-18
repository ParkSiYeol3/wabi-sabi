import type { Metadata } from "next";

// page.tsx 가 "use client" 라 metadata 를 내보낼 수 없어 레이아웃에서 제공한다.
export const metadata: Metadata = {
  title: "장바구니",
  description: "WABI-SABI 장바구니",
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

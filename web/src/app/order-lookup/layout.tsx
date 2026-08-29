import type { Metadata } from "next";

// page.tsx 가 "use client" 라 metadata 를 내보낼 수 없어 레이아웃에서 제공한다
// (cart 와 동일 패턴). 없으면 탭 제목이 사이트 기본값("와비사비 WABI-SABI")으로만
// 떠 다른 페이지와 달리 페이지명이 없었다.
export const metadata: Metadata = {
  title: "비회원 주문조회",
  description: "주문번호와 전화번호로 비회원 주문의 배송 상태를 조회합니다.",
};

export default function OrderLookupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

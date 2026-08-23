import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Shop 으로 돌아가기(대표님). variant:
//  · subtle — 상품 상세 상단에 "보일 듯 안 보일 듯" 흐린 텍스트 링크.
//  · button — 월간 그릇·오늘의 와비사비에서 Shop 전체로 돌아가는 버튼(모바일).
export function BackToShop({
  variant = "subtle",
  className,
}: {
  variant?: "subtle" | "button";
  className?: string;
}) {
  if (variant === "button") {
    // 텍스트는 "Shop"만, 완벽한 원형 대신 불완전한 비정형 테두리(대표님 — 특색 버튼과
    // 같은 와비사비 미감).
    return (
      <Link
        href="/shop"
        style={{ borderRadius: "42% 58% 62% 38% / 55% 45% 55% 45%" }}
        className={cn(
          "inline-flex items-center gap-1.5 border border-wabi-border px-4 py-2 text-xs font-medium text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg",
          className,
        )}
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.6} aria-hidden />
        Shop
      </Link>
    );
  }
  return (
    <Link
      href="/shop"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-wabi-fg-muted/60 transition-colors hover:text-wabi-fg",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
      Shop
    </Link>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

// 채워지는 아웃라인 CTA (#231) — 호버/포커스 시 먹색 판이 아래에서 차오르며
// 글자까지 크림색으로 바뀐다. 반전 문구를 판 위에 얹어 함께 슬라이드(마스킹)해
// 판이 절반만 오른 순간 글자가 배경에 묻히지 않게 한다. 판은 aria-hidden.
// 홈 Shop CTA 와 "오늘의 와비사비" 버튼이 공유 — 트렌디 일관성(대표님).
export function CtaLink({
  href,
  label,
  size = "sm",
  full = false,
  className,
}: {
  href: string;
  label: string;
  size?: "sm" | "lg";
  full?: boolean;
  className?: string;
}) {
  const sizeCls =
    size === "lg"
      ? "rounded-3xl px-6 py-3 text-[10px] tracking-[1.5px] md:rounded-full md:px-9 md:py-4 md:text-[12px] md:tracking-[2px]"
      : "rounded-full px-5 py-2.5 text-[10px] tracking-[1.5px] md:text-[11px]";
  const overlayPad = size === "lg" ? "px-6 md:px-9" : "px-5";

  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden border border-[#423c30]/70 text-center [font-family:var(--ws-mono)] leading-relaxed text-[#423c30]",
        full ? "block w-full" : "inline-block",
        sizeCls,
        className,
      )}
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex translate-y-full items-center justify-center bg-[#423c30] text-[#f3ebdd] transition-transform duration-500 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none",
          overlayPad,
        )}
      >
        <span>{label}</span>
      </span>
    </Link>
  );
}

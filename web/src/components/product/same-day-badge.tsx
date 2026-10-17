import { cn } from "@/lib/utils";

// 당일발송 뱃지(대표님 #838) — 사이트 CTA 버튼(바로 구매·회원가입하고 받기)과 같은 먹색
// 바탕·흰 글씨·각진 모서리로 무드를 맞춘다(시열님: 붉은 도장은 사이트와 어긋남).
// 목록 카드는 카테고리 줄 오른쪽, 상세는 카테고리 옆. 문구는 발송 기준 '당일발송'('당일배송'은
// 당일 도착으로 읽혀 쓰지 않는다). 품절이면 호출부에서 그리지 않는다.
export function SameDayBadge({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 bg-wabi-accent leading-none tracking-[0.08em] whitespace-nowrap text-white",
        size === "sm" ? "px-1.5 py-1 text-[10px]" : "px-2 py-1.5 text-xs",
        className,
      )}
    >
      당일발송
    </span>
  );
}

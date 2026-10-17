import { cn } from "@/lib/utils";

// 당일발송 뱃지(대표님 #838) — 인주색 테두리에 살짝 기운 도장(낙관) 모양. 목록 카드는
// 카테고리 줄 오른쪽, 상세는 카테고리 옆. 문구는 발송 기준 '당일발송'('당일배송'은
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
        "inline-block shrink-0 -rotate-2 rounded-[2px] border border-wabi-seal bg-wabi-seal/5 leading-[1.3] tracking-[0.06em] whitespace-nowrap text-wabi-seal",
        size === "sm" ? "px-1 pt-px text-[10px]" : "px-1.5 pt-px text-xs",
        className,
      )}
    >
      당일발송
    </span>
  );
}

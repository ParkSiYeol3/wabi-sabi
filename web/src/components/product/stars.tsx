import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// 평점 별 표시 (정수 반올림). value 1~5.
export function Stars({
  value,
  className,
  size = 16,
}: {
  value: number;
  className?: string;
  size?: number;
}) {
  const filled = Math.round(value);
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`별점 ${value}점`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          strokeWidth={1.5}
          className={
            i < filled
              ? "fill-wabi-accent text-wabi-accent"
              : "text-wabi-border"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

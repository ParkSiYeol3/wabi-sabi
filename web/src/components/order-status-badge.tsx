import { statusLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

// 주문 상태 배지 (#170) — 상태가 작은 회색 텍스트라 구분이 안 됐다.
// 색은 WCAG AA 대비를 만족하는 700 계열(amber-600 등은 작은 텍스트에서 미달).
// 미니멀 톤 유지: 배경 채우지 않고 테두리 + 글자색만.
const STYLE: Record<string, string> = {
  pending: "border-amber-300 text-amber-700", // 결제 대기 — 조치 필요
  paid: "border-wabi-fg text-wabi-fg", // 결제 완료 — 진행 중 강조
  shipping: "border-blue-300 text-blue-700", // 배송 중
  delivered: "border-wabi-border text-wabi-fg-muted", // 완료 — 차분하게
  cancelled: "border-red-300 text-red-700", // 취소
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 border px-2 py-0.5 text-xs whitespace-nowrap",
        STYLE[status] ?? "border-wabi-border text-wabi-fg-muted",
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

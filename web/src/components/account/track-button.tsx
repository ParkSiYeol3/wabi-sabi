import { Truck } from "lucide-react";
import { trackingUrl } from "@/lib/orders";

// 배송 조회 버튼(#754). 주문의 택배사(#756) 조회 페이지를 새 창으로 연다. 주문 목록·마이페이지 공용.
// 손님이 배송 중 주문에서 가장 먼저 찾는 동작이라 채운 버튼으로 둔다.
export function TrackButton({
  courier,
  invoice,
}: {
  courier: string | null;
  invoice: string;
}) {
  return (
    <a
      href={trackingUrl(courier, invoice)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-wabi-fg px-3.5 py-2 text-xs font-medium text-wabi-bg transition-colors hover:bg-wabi-fg/85"
    >
      <Truck className="size-3.5" strokeWidth={1.8} aria-hidden />
      배송 조회<span className="sr-only"> (새 창 열림)</span>
    </a>
  );
}

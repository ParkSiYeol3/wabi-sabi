import Link from "next/link";
import { TrackButton } from "@/components/account/track-button";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { displayStatus, formatDateKST } from "@/lib/orders";

export type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  preparing_at: string | null;
  tracking_number: string | null;
  ordered_at: string;
  order_items: { product_name: string }[];
};

// 마이페이지 맨 위 주문·배송(#754). 최근 주문 몇 건 + 상태, 배송 중이면 바로 조회.
// 전체 목록·취소·리뷰는 /mypage/orders 에서.
export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">주문·배송</h2>
        <Link
          href="/mypage/orders"
          className="text-sm text-wabi-fg-muted underline-offset-4 transition-colors hover:text-wabi-fg hover:underline"
        >
          전체 주문 내역 →
        </Link>
      </div>

      {orders.length > 0 ? (
        <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border">
          {orders.map((o) => {
            const first = o.order_items[0];
            const rest = o.order_items.length - 1;
            const track = o.status === "shipping" ? o.tracking_number : null;
            return (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4"
              >
                <Link
                  href={`/mypage/orders/${o.id}`}
                  aria-label={`주문 ${o.order_number} 상세 보기`}
                  className="group min-w-0 flex-1 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-numeric font-medium underline-offset-4 group-hover:underline">
                      {o.order_number}
                    </span>
                    <OrderStatusBadge status={displayStatus(o)} />
                  </span>
                  {/* 상품명이 길면 이름만 말줄임, 날짜는 남긴다 */}
                  <span className="mt-1 flex min-w-0 text-wabi-fg-muted">
                    <span className="truncate">
                      {first?.product_name}
                      {rest > 0 ? ` 외 ${rest}건` : ""}
                    </span>
                    <span className="shrink-0 whitespace-pre font-numeric">
                      {" · "}
                      {formatDateKST(o.ordered_at)}
                    </span>
                  </span>
                </Link>
                {track && <TrackButton invoice={track} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-wabi-fg-muted">
          아직 주문 내역이 없습니다.
        </p>
      )}
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { TrackButton } from "@/components/account/track-button";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { byLineAmount, displayStatus, KST } from "@/lib/orders";

export type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  preparing_at: string | null;
  tracking_number: string | null;
  courier: string | null;
  ordered_at: string;
  order_items: {
    product_name: string;
    price: number;
    quantity: number;
    products: { images: unknown } | null;
  }[];
};

// "10월 2일" (올해가 아니면 연도까지). 목록에서 날짜는 언제 산 건지 떠올리는 용도라 짧게.
function orderedOn(iso: string): string {
  const d = new Date(iso);
  const year = (x: Date) => x.toLocaleDateString("ko-KR", { timeZone: KST, year: "numeric" });
  return d.toLocaleDateString("ko-KR", {
    timeZone: KST,
    ...(year(d) === year(new Date()) ? {} : { year: "numeric" }),
    month: "long",
    day: "numeric",
  });
}

function thumbOf(item?: RecentOrder["order_items"][number]): string | null {
  const imgs = item?.products?.images;
  return Array.isArray(imgs) && typeof imgs[0] === "string" ? imgs[0] : null;
}

// 마이페이지 주문·배송(#754). 최근 주문 몇 건 + 상태, 배송 중이면 바로 조회.
// 손님은 주문번호(WSB…)로 주문을 기억하지 않는다(시열님 10/3) → 사진·상품명·날짜로
// 알아보게 하고, 주문번호는 상세에만 둔다. 여러 상품이면 대표(금액 큰 것) 사진 1장 +
// 모서리 "+N", 이름은 "대표 외 N건"(#761, 요약 칸이라 한 주문 = 한 줄).
// 상품별 목록은 /mypage/orders. 금액·취소·리뷰는 /mypage/orders 에서
// (요약 칸에 금액까지 넣으면 375px 에서 줄이 넘친다).
export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <section className="mt-14">
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
            const first = byLineAmount(o.order_items)[0];
            const rest = o.order_items.length - 1;
            const track = o.status === "shipping" ? o.tracking_number : null;
            const thumb = thumbOf(first);
            return (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4"
              >
                {/* basis-52: 좁은 화면(확대 포함)에선 버튼이 아래 줄로 내려간다.
                    aria-label 은 두지 않는다(상태 배지까지 링크 이름으로 읽히게). */}
                <Link
                  href={`/mypage/orders/${o.id}`}
                  className="group flex min-w-0 flex-1 basis-52 items-center gap-3.5 text-sm"
                >
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon
                        className="size-5 text-wabi-fg-muted/40"
                        strokeWidth={1}
                        aria-hidden
                      />
                    )}
                    {rest > 0 && (
                      <span aria-hidden className="absolute right-0 bottom-0 bg-wabi-fg/80 px-1.5 py-0.5 font-numeric text-[11px] leading-none text-wabi-bg">
                        +{rest}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* 이름이 길면 이름만 말줄임, "외 N건"은 남긴다 */}
                    <span className="flex min-w-0 font-medium underline-offset-4 group-hover:underline">
                      <span className="truncate">{first?.product_name}</span>
                      {rest > 0 && (
                        <span className="shrink-0 whitespace-pre"> 외 {rest}건</span>
                      )}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-wabi-fg-muted">
                      <OrderStatusBadge status={displayStatus(o)} />
                      <span className="font-numeric">
                        {orderedOn(o.ordered_at)} 주문
                      </span>
                    </span>
                  </span>
                </Link>
                {track && <TrackButton courier={o.courier} invoice={track} />}
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

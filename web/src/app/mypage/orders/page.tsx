import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/container";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { createClient } from "@/lib/supabase/server";
import { won, formatDateKST, withdrawalDeadlineKST } from "@/lib/orders";

export const metadata: Metadata = { title: "주문 내역" };

type OrderItem = {
  product_name: string;
  quantity: number;
  // 상품이 삭제되면 order_items.product_id 가 null 이 되므로(0001) 조인 결과도 null.
  products: { images: unknown } | null;
};
type Order = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  ordered_at: string;
  delivered_at: string | null;
  order_items: OrderItem[];
};

// 주문 대표 썸네일 — 첫 항목의 첫 이미지. 없으면 플레이스홀더.
function firstImage(item?: OrderItem): string | null {
  const imgs = item?.products?.images;
  return Array.isArray(imgs) && typeof imgs[0] === "string" ? imgs[0] : null;
}


export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/mypage/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total_price, ordered_at, delivered_at, order_items(product_name, quantity, products(images))",
    )
    .order("ordered_at", { ascending: false })
    .returns<Order[]>();

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">주문 내역</h1>

      {!orders || orders.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          주문 내역이 없습니다.
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {orders.map((o) => {
            const first = o.order_items[0];
            const rest = o.order_items.length - 1;
            const thumb = firstImage(first);
            return (
              <li
                key={o.id}
                className="border border-wabi-border p-5 transition-colors hover:border-wabi-fg"
              >
                <div className="flex items-start gap-4">
                  {/* 대표 썸네일 — 어떤 주문인지 한눈에 */}
                  <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        aria-hidden
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon
                        className="size-6 text-wabi-fg-muted/40"
                        strokeWidth={1}
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      {/* 상세로 이동 (#137) — 송장번호·배송지·전체 항목은 상세에서 */}
                      <Link
                        href={`/mypage/orders/${o.id}`}
                        aria-label={`주문 ${o.order_number} 상세 보기`}
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <OrderStatusBadge status={o.status} />
                    </div>

                    <p className="mt-1.5 text-xs text-wabi-fg-muted">
                      {formatDateKST(o.ordered_at)}
                      {o.delivered_at && (
                        <> · {formatDateKST(o.delivered_at)} 수령</>
                      )}
                    </p>

                    <p className="mt-3 text-sm">
                      {first?.product_name}
                      {first && first.quantity > 1 ? ` ${first.quantity}개` : ""}
                      {rest > 0 ? ` 외 ${rest}건` : ""}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {won(o.total_price)}
                    </p>

                    {o.delivered_at && (
                      <p className="mt-3 text-xs text-wabi-fg-muted">
                        교환·환불 요청은{" "}
                        {withdrawalDeadlineKST(o.delivered_at)}까지 가능합니다.{" "}
                        <Link
                          href="/legal/refund"
                          className="underline hover:text-wabi-fg"
                        >
                          교환·환불 안내
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                {o.status === "paid" && (
                  <div className="mt-4 border-t border-wabi-border pt-4">
                    <CancelOrderButton orderId={o.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageIcon, PenLine } from "lucide-react";
import { Container } from "@/components/layout/container";
import { CancelOrderButton } from "@/components/account/cancel-order-button";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { createClient } from "@/lib/supabase/server";
import { formatDateKST, withdrawalDeadlineKST } from "@/lib/orders";
import { Price } from "@/components/product/price";

export const metadata: Metadata = { title: "주문 내역" };

type OrderItem = {
  // 리뷰 링크용 상품 id. 상품이 삭제되면 null(0001) — 이때 리뷰 대상이 사라져 버튼 생략.
  product_id: string | null;
  product_name: string;
  quantity: number;
  // 상품이 삭제되면 order_items.product_id 가 null 이 되므로(0001) 조인 결과도 null.
  products: { images: unknown } | null;
};

// 결제 완료로 간주해 리뷰를 허용하는 상태(reviews.hasPurchased 와 동일 기준). pending·
// cancelled 은 제외.
const REVIEWABLE_STATUSES = ["paid", "shipping", "delivered"];
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
      "id, order_number, status, total_price, ordered_at, delivered_at, order_items(product_id, product_name, quantity, products(images))",
    )
    .order("ordered_at", { ascending: false })
    .returns<Order[]>();

  // 이미 리뷰를 쓴 상품(내 리뷰) — 버튼을 "리뷰 쓰기"/"리뷰 완료"로 구분한다. RLS 로
  // 본인 리뷰만 조회된다. 한 번에 받아 Set 으로 조회.
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("product_id")
    .eq("user_id", user.id)
    .returns<{ product_id: string }[]>();
  const reviewed = new Set((myReviews ?? []).map((r) => r.product_id));

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">Orders</h1>

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

            // 리뷰 대상 — 결제된 주문의 (삭제 안 된) 상품을 중복 제거. 여러 상품이면
            // 상세로 보내 상품별로 고르게 하고, 한 상품이면 바로 그 상품 리뷰로 점프.
            const reviewTargets: [string, string][] = REVIEWABLE_STATUSES.includes(
              o.status,
            )
              ? [
                  ...new Map(
                    o.order_items
                      .filter((it) => it.product_id)
                      .map((it) => [it.product_id as string, it.product_name]),
                  ),
                ]
              : [];
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
                        className="font-numeric text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <OrderStatusBadge status={o.status} />
                    </div>

                    <p className="mt-1.5 font-numeric text-xs text-wabi-fg-muted">
                      {formatDateKST(o.ordered_at)}
                      {o.delivered_at && (
                        <> · {formatDateKST(o.delivered_at)} 수령</>
                      )}
                    </p>

                    <p className="mt-3 font-numeric text-sm">
                      {first?.product_name}
                      {first && first.quantity > 1 ? ` ${first.quantity}개` : ""}
                      {rest > 0 ? ` 외 ${rest}건` : ""}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      <Price value={o.total_price} />
                    </p>

                    {o.delivered_at && (
                      <p className="mt-3 font-numeric text-xs text-wabi-fg-muted">
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

                {(o.status === "paid" || reviewTargets.length > 0) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-wabi-border pt-4">
                    {o.status === "paid" && <CancelOrderButton orderId={o.id} />}
                    {reviewTargets.length > 0 && (
                      <ReviewButton
                        orderId={o.id}
                        targets={reviewTargets}
                        reviewed={reviewed}
                      />
                    )}
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

// 주문 내역 → 리뷰 작성 유도(대표님). 한 상품이면 그 상품 상세의 리뷰 섹션으로 바로,
// 여러 상품이면 주문 상세로 보내 상품별 버튼에서 고르게 한다. 대상 상품을 모두 이미
// 리뷰했으면 "리뷰 확인"으로 라벨만 바꾼다(상품 페이지가 이미 작성 상태를 보여줌).
function ReviewButton({
  orderId,
  targets,
  reviewed,
}: {
  orderId: string;
  targets: [string, string][];
  reviewed: Set<string>;
}) {
  const single = targets.length === 1;
  const allReviewed = targets.every(([pid]) => reviewed.has(pid));
  const href = single ? `/shop/${targets[0][0]}#reviews` : `/mypage/orders/${orderId}`;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-wabi-border px-3.5 py-2 text-xs font-medium text-wabi-fg transition-colors hover:border-wabi-fg hover:bg-wabi-muted"
    >
      <PenLine className="size-3.5" strokeWidth={1.8} aria-hidden />
      {allReviewed ? "리뷰 확인" : "리뷰 쓰기"}
    </Link>
  );
}

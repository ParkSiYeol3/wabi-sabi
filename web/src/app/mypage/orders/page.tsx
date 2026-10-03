import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/layout/container";
import { CancelOrderButton } from "@/components/account/cancel-order-button";
import { ReviewLink, reviewLines } from "@/components/account/review-link";
import { TrackButton } from "@/components/account/track-button";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { createClient } from "@/lib/supabase/server";
import {
  byLineAmount,
  formatDateKST,
  withdrawalDeadlineKST,
  displayStatus,
} from "@/lib/orders";
import { Price } from "@/components/product/price";

export const metadata: Metadata = { title: "주문 내역" };

type OrderItem = {
  // 리뷰 링크용 상품 id. 상품이 삭제되면 null(0001) — 이때 리뷰 대상이 사라져 버튼 생략.
  product_id: string | null;
  product_name: string;
  price: number;
  quantity: number;
  options: { name: string; value: string }[] | null;
  // 상품이 삭제되면 order_items.product_id 가 null 이 되므로(0001) 조인 결과도 null.
  // 판매 중지도 null(products 공개 읽기 = is_active). 이때 리뷰 버튼을 달지 않는다.
  products: { images: unknown } | null;
};

// 결제 완료로 간주해 리뷰를 허용하는 상태(reviews.hasPurchased 와 동일 기준). pending·
// cancelled 은 제외.
const REVIEWABLE_STATUSES = ["paid", "shipping", "delivered"];
type Order = {
  id: string;
  order_number: string;
  status: string;
  preparing_at: string | null;
  tracking_number: string | null;
  courier: string | null;
  total_price: number;
  ordered_at: string;
  delivered_at: string | null;
  order_items: OrderItem[];
};

// 상품 썸네일 — 상품의 첫 이미지. 없으면(상품 삭제 등) 플레이스홀더.
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
      "id, order_number, status, preparing_at, tracking_number, courier, total_price, ordered_at, delivered_at, order_items(product_id, product_name, price, quantity, options, products(images))",
    )
    // 미결제(pending)는 숨긴다 — 결제창을 열었다가 결제하지 않고 뒤로가면 주문이
    // pending 으로 남는데(결제 전 orderId 발급이 필요한 토스 결제창 구조), 이는
    // 실제 결제된 주문이 아니라 "결제 대기"로 보이면 오해를 준다(대표님). 방치된
    // pending 은 cron(cleanup-pending)이 cancelled 로 정리한다. paid 이후 상태만 노출.
    .neq("status", "pending")
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
            // 상품은 한 줄에 하나(#761, 카페24 기본 주문조회·쿠팡 방식). 금액 큰 순,
            // 3개까지 펼치고 나머지는 접는다(주문 하나가 화면을 다 차지하지 않게).
            const items = byLineAmount(o.order_items);
            const shown = items.slice(0, ITEMS_SHOWN);
            const hidden = items.slice(ITEMS_SHOWN);
            // 리뷰 버튼은 상품 줄마다(#770). 주문 단위 버튼은 여러 상품이면 어느 상품인지
            // 몰라 주문 상세로 보냈다. 결제된 주문의 판매 중 상품, 상품당 한 번.
            const reviewAt = REVIEWABLE_STATUSES.includes(o.status)
              ? reviewLines(items)
              : new Set<OrderItem>();
            const row = (it: OrderItem, i: number) => (
              <ItemRow
                key={i}
                item={it}
                review={
                  reviewAt.has(it) && it.product_id
                    ? { done: reviewed.has(it.product_id) }
                    : null
                }
              />
            );
            const track = o.status === "shipping" ? o.tracking_number : null;
            return (
              <li
                key={o.id}
                className="border border-wabi-border p-5"
              >
                {/* 머리: 언제 산 주문인지 + 상태. 주문번호는 문의할 때 쓰도록 작게(10/3 시열님:
                    손님은 주문번호로 주문을 기억하지 않는다). 송장·배송지·옵션 전체는 상세에서(#137). */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-numeric font-medium">
                        {formatDateKST(o.ordered_at)} 주문
                      </span>
                      <OrderStatusBadge status={displayStatus(o)} />
                    </p>
                    <p className="mt-1 font-numeric text-xs text-wabi-fg-muted">
                      주문번호 {o.order_number}
                      {o.delivered_at && (
                        <span className="whitespace-nowrap">
                          {" "}
                          · {formatDateKST(o.delivered_at)} 수령
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/mypage/orders/${o.id}`}
                    className="shrink-0 py-1 text-xs text-wabi-fg-muted underline-offset-4 transition-colors hover:text-wabi-fg hover:underline"
                  >
                    주문 상세<span className="sr-only"> ({formatDateKST(o.ordered_at)} 주문)</span> →
                  </Link>
                </div>

                <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border">
                  {shown.map(row)}
                </ul>
                {hidden.length > 0 && (
                  <details className="group border-b border-wabi-border">
                    <summary className="cursor-pointer list-none py-2.5 text-xs text-wabi-fg-muted hover:text-wabi-fg [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">
                        상품 <span className="font-numeric">{hidden.length}</span>개 더 보기
                      </span>
                      <span className="hidden group-open:inline">접기</span>
                    </summary>
                    <ul className="divide-y divide-wabi-border border-t border-wabi-border">
                      {hidden.map(row)}
                    </ul>
                  </details>
                )}

                <p className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-wabi-fg-muted">결제 금액</span>
                  <span className="font-medium">
                    <Price value={o.total_price} />
                  </span>
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

                {/* 취소는 결제 완료이면서 상품 준비 전만(0071 — 포장이 시작되면 문의로).
                    배송 중이면 상세에 들어가지 않고 바로 조회(#754). */}
                {((o.status === "paid" && !o.preparing_at) || track) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-wabi-border pt-4">
                    {track && <TrackButton courier={o.courier} invoice={track} />}
                    {o.status === "paid" && !o.preparing_at && (
                      <CancelOrderButton orderId={o.id} />
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

const ITEMS_SHOWN = 3;

// 주문 카드 안 상품 한 줄: 사진 + 이름 + 옵션 + 수량 (+ 리뷰 버튼).
function ItemRow({
  item,
  review,
}: {
  item: OrderItem;
  review: { done: boolean } | null;
}) {
  const thumb = firstImage(item);
  const options = (item.options ?? []).map((op) => `${op.name}: ${op.value}`);
  return (
    <li className="flex items-center gap-3.5 py-3">
      <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            aria-hidden
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
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-keep">{item.product_name}</p>
        <p className="mt-0.5 font-numeric text-xs text-wabi-fg-muted">
          {options.length > 0 && <>{options.join(" · ")} · </>}
          {item.quantity}개
        </p>
      </div>
      {review && item.product_id && (
        <ReviewLink
          productId={item.product_id}
          productName={item.product_name}
          done={review.done}
        />
      )}
    </li>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { CancelOrderButton } from "@/components/account/cancel-order-button";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { createClient } from "@/lib/supabase/server";
import {
  byLineAmount,
  formatDateKST,
  withdrawalDeadlineKST,
  courierOf,
  trackingUrl,
  displayStatus,
} from "@/lib/orders";
import { ImageIcon, PenLine } from "lucide-react";
import { Price } from "@/components/product/price";
import { parseUuid } from "@/lib/validation";

export const metadata: Metadata = { title: "주문 상세" };

// 결제 완료로 간주해 리뷰를 허용하는 상태(reviews.hasPurchased 와 동일 기준).
const REVIEWABLE_STATUSES = ["paid", "shipping", "delivered"];

// 주문 상세 (#137) — 어드민이 송장번호를 저장하는데 고객이 그것을 볼 화면이 없었다.
// 배송지·주문 항목 전체·선물포장 여부도 주문 후엔 확인할 수 없었다.
// RLS(own orders select)가 본인 주문만 노출하므로 사용자 클라이언트로 조회한다.
type Detail = {
  id: string;
  order_number: string;
  status: string;
  preparing_at: string | null;
  total_price: number;
  shipping_fee: number;
  recipient: string;
  phone: string;
  address: string;
  delivery_memo: string | null;
  tracking_number: string | null;
  courier: string | null;
  ordered_at: string;
  delivered_at: string | null;
  order_items: {
    // 리뷰 링크용 상품 id. 상품 삭제 시 null(0001) → 리뷰 버튼 생략.
    product_id: string | null;
    product_name: string;
    quantity: number;
    price: number;
    addons: { code: string; name: string; price: number }[] | null;
    options: { name: string; value: string }[] | null;
    // 사진·상품 링크(#763). products RLS 는 판매 중(is_active)만 보여 줘서 판매 중지·삭제
    // 상품은 null → 플레이스홀더 + 링크 없는 이름.
    products: { images: unknown } | null;
  }[];
  gift_options: { message: string | null }[];
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = parseUuid(id);
  if (!orderId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/mypage/orders/${orderId}`);

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, preparing_at, total_price, shipping_fee, recipient, phone, address, delivery_memo, tracking_number, courier, ordered_at, delivered_at, order_items(product_id, product_name, quantity, price, addons, options, products(images)), gift_options(message)",
    )
    .eq("id", orderId)
    .maybeSingle<Detail>();

  // 타인의 주문은 RLS 로 조회 자체가 비므로 여기서 404 가 된다.
  if (!order) notFound();

  const gift = order.gift_options?.[0];

  // 리뷰 작성 유도(대표님) — 결제된 주문이면 상품별로 리뷰 링크. 이미 쓴 상품은
  // 라벨을 "리뷰 확인"으로. 본인 리뷰만 RLS 로 조회.
  const canReview = REVIEWABLE_STATUSES.includes(order.status);
  const { data: myReviews } = canReview
    ? await supabase
        .from("reviews")
        .select("product_id")
        .eq("user_id", user.id)
        .returns<{ product_id: string }[]>()
    : { data: null };
  const reviewed = new Set((myReviews ?? []).map((r) => r.product_id));

  return (
    <Container className="py-16">
      <Link
        href="/mypage/orders"
        className="text-xs text-wabi-fg-muted hover:text-wabi-fg"
      >
        ← 주문 내역
      </Link>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* 제목은 "주문 상세", 주문번호는 아래 줄에 작게(10/3 시열님). 문의·비회원 조회에 쓰는 값이라 남긴다. */}
        <h1 className="text-2xl font-semibold tracking-wide">주문 상세</h1>
        <OrderStatusBadge
          status={displayStatus(order)}
          className="text-sm"
        />
      </div>
      <p className="mt-2 font-numeric text-sm text-wabi-fg-muted">
        {formatDateKST(order.ordered_at)} 주문
        {order.delivered_at && ` · ${formatDateKST(order.delivered_at)} 수령`}
        {` · 주문번호 ${order.order_number}`}
      </p>

      {/* 주문 항목 */}
      <section className="mt-10">
        <h2 className="text-base font-medium">주문 상품</h2>
        <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border text-sm">
          {byLineAmount(order.order_items).map((it, i) => {
            const lineAddons = it.addons ?? [];
            const lineOptions = it.options ?? [];
            const addonSum = lineAddons.reduce((s, a) => s + a.price, 0);
            const imgs = it.products?.images;
            const thumb =
              Array.isArray(imgs) && typeof imgs[0] === "string" ? imgs[0] : null;
            // 판매 중인 상품만 링크(판매 중지·삭제는 상품 페이지가 없다).
            const href = it.product_id && it.products ? `/shop/${it.product_id}` : null;
            const name = (
              <>
                {it.product_name}
                {it.quantity > 1 && (
                  <span className="font-numeric text-wabi-fg-muted">
                    {" "}
                    × {it.quantity}
                  </span>
                )}
              </>
            );
            return (
              <li key={i} className="flex gap-3.5 py-3">
                {href ? (
                  <Link
                    href={href}
                    tabIndex={-1}
                    aria-hidden
                    className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted"
                  >
                    <ItemThumb src={thumb} />
                  </Link>
                ) : (
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted">
                    <ItemThumb src={thumb} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    {href ? (
                      <Link
                        href={href}
                        className="break-keep underline-offset-4 hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="break-keep">{name}</span>
                    )}
                    {/* 금액 + 리뷰 버튼을 오른쪽 한 칸에(#765, 상품명 아래 작은 외곽선 버튼은
                        눈에 안 띄었다). 리뷰는 결제된 주문의 판매 중 상품만(href 있을 때). */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Price value={it.price * it.quantity + addonSum} />
                      {canReview && href && it.product_id && (
                        <ReviewLink
                          productId={it.product_id}
                          done={reviewed.has(it.product_id)}
                        />
                      )}
                    </div>
                  </div>
                  {lineOptions.length > 0 && (
                    <p className="mt-1 text-xs text-wabi-fg-muted">
                      {lineOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                    </p>
                  )}
                  {lineAddons.length > 0 && (
                    <p className="mt-1 text-xs text-wabi-fg-muted">
                      + {lineAddons.map((a) => a.name).join(", ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex items-center justify-between text-sm text-wabi-fg-muted">
          <span>배송비</span>
          {order.shipping_fee > 0 ? (
            <Price value={order.shipping_fee} />
          ) : (
            <span>무료</span>
          )}
        </p>
        <p className="mt-2 flex items-center justify-between text-sm font-medium">
          <span>결제 금액</span>
          <Price value={order.total_price} />
        </p>
      </section>

      {/* 배송 정보 */}
      <section className="mt-10">
        <h2 className="text-base font-medium">배송 정보</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="받는 분" value={order.recipient} />
          <Row label="연락처" value={order.phone} />
          <Row label="배송지" value={order.address} />
          {order.delivery_memo && (
            <Row label="배송 요청" value={order.delivery_memo} />
          )}
          {order.tracking_number && (
            // 송장번호는 저장돼 있었지만 고객에게 보여줄 곳이 없었고(#137), 번호만
            // 있어 직접 택배사를 찾아가야 했다 → 배송조회 링크를 함께 준다(#240, 택배사별 직링크 #754·#756).
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-wabi-fg-muted">송장번호</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-numeric">
                  {courierOf(order.courier).name}{" "}
                  {order.tracking_number}
                </span>
                <a
                  href={trackingUrl(order.courier, order.tracking_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline underline-offset-2 hover:text-wabi-fg"
                >
                  배송조회<span className="sr-only"> (새 창 열림)</span> →
                </a>
              </dd>
            </div>
          )}
          {gift && (
            <Row
              label="선물 포장"
              value={gift.message ? `메시지: ${gift.message}` : "신청"}
            />
          )}
        </dl>

        {/* 배송 중이면 조회 CTA 를 눈에 띄게 — 고객이 가장 자주 확인하는 동작 */}
        {order.status === "shipping" && order.tracking_number && (
          <a
            href={trackingUrl(order.courier, order.tracking_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-wabi-fg px-4 py-2 text-sm transition-colors hover:bg-wabi-fg hover:text-wabi-bg"
          >
            배송 조회하기<span className="sr-only"> (새 창 열림)</span> →
          </a>
        )}
      </section>

      {/* 청약철회 안내 — 수령일이 기산점 (#124) */}
      {order.delivered_at && (
        <p className="mt-8 font-numeric text-xs text-wabi-fg-muted">
          교환·환불 요청은 {withdrawalDeadlineKST(order.delivered_at)}까지
          가능합니다.{" "}
          <Link href="/legal/refund" className="underline hover:text-wabi-fg">
            교환·환불 안내 보기
          </Link>
        </p>
      )}

      {/* 배송 전(paid)이면서 상품 준비 전인 주문만 취소 가능 (#57, 0071) */}
      {order.status === "paid" && !order.preparing_at && (
        <div className="mt-8 border-t border-wabi-border pt-6">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}
      {order.status === "paid" && order.preparing_at && (
        <p className="mt-8 border-t border-wabi-border pt-6 text-sm break-keep text-wabi-fg-muted">
          상품 준비가 시작되어 직접 취소할 수 없어요. 취소가 필요하면{" "}
          <Link
            href="/inquiry"
            className="underline underline-offset-2 hover:text-wabi-fg"
          >
            문의 게시판
          </Link>
          으로 알려주세요.
        </p>
      )}
    </Container>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <dt className="w-24 shrink-0 text-wabi-fg-muted">{label}</dt>
      <dd className={mono ? "font-mono" : "font-numeric"}>{value}</dd>
    </div>
  );
}

// 주문 상품 사진(#763) — 56px, 없으면 플레이스홀더.
function ItemThumb({ src }: { src: string | null }) {
  return src ? (
    <Image src={src} alt="" fill sizes="56px" className="object-cover" />
  ) : (
    <ImageIcon className="size-5 text-wabi-fg-muted/40" strokeWidth={1} aria-hidden />
  );
}

// 리뷰 버튼(#765) — 안 쓴 상품은 채운 버튼, 이미 쓴 상품은 외곽선 "리뷰 확인".
// 상품 상세의 리뷰 섹션으로 바로(#reviews, ScrollToHash 가 사이트 안 이동도 맞춘다).
function ReviewLink({ productId, done }: { productId: string; done: boolean }) {
  return (
    <Link
      href={`/shop/${productId}#reviews`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
        done
          ? "border border-wabi-border text-wabi-fg hover:border-wabi-fg hover:bg-wabi-muted"
          : "border border-transparent bg-wabi-fg text-wabi-bg hover:bg-wabi-fg/85"
      }`}
    >
      <PenLine className="size-3.5" strokeWidth={1.8} aria-hidden />
      {done ? "리뷰 확인" : "리뷰 쓰기"}
    </Link>
  );
}

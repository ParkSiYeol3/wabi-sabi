import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { createClient } from "@/lib/supabase/server";
import {
  statusLabel,
  won,
  formatDateKST,
  withdrawalDeadlineKST,
} from "@/lib/orders";
import { parseUuid } from "@/lib/validation";

export const metadata: Metadata = { title: "주문 상세" };

// 주문 상세 (#137) — 어드민이 송장번호를 저장하는데 고객이 그것을 볼 화면이 없었다.
// 배송지·주문 항목 전체·선물포장 여부도 주문 후엔 확인할 수 없었다.
// RLS(own orders select)가 본인 주문만 노출하므로 사용자 클라이언트로 조회한다.
type Detail = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  recipient: string;
  phone: string;
  address: string;
  delivery_memo: string | null;
  tracking_number: string | null;
  ordered_at: string;
  delivered_at: string | null;
  order_items: { product_name: string; quantity: number; price: number }[];
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
      "id, order_number, status, total_price, recipient, phone, address, delivery_memo, tracking_number, ordered_at, delivered_at, order_items(product_name, quantity, price), gift_options(message)",
    )
    .eq("id", orderId)
    .maybeSingle<Detail>();

  // 타인의 주문은 RLS 로 조회 자체가 비므로 여기서 404 가 된다.
  if (!order) notFound();

  const gift = order.gift_options?.[0];

  return (
    <Container className="py-16">
      <Link
        href="/mypage/orders"
        className="text-xs text-wabi-fg-muted hover:text-wabi-fg"
      >
        ← 주문 내역
      </Link>

      <div className="mt-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-wide">
          {order.order_number}
        </h1>
        <span className="text-sm text-wabi-fg-muted">
          {statusLabel(order.status)}
        </span>
      </div>
      <p className="mt-2 text-sm text-wabi-fg-muted">
        {formatDateKST(order.ordered_at)} 주문
        {order.delivered_at && ` · ${formatDateKST(order.delivered_at)} 수령`}
      </p>

      {/* 주문 항목 */}
      <section className="mt-10">
        <h2 className="text-base font-medium">주문 상품</h2>
        <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border text-sm">
          {order.order_items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3">
              <span>
                {it.product_name}
                {it.quantity > 1 && (
                  <span className="text-wabi-fg-muted"> × {it.quantity}</span>
                )}
              </span>
              <span>{won(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center justify-between text-sm font-medium">
          <span>결제 금액</span>
          <span>{won(order.total_price)}</span>
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
            // 송장번호는 저장돼 있었지만 고객에게 보여줄 곳이 없었다 (#137).
            <Row label="송장번호" value={order.tracking_number} mono />
          )}
          {gift && (
            <Row
              label="선물 포장"
              value={gift.message ? `메시지: ${gift.message}` : "신청"}
            />
          )}
        </dl>
      </section>

      {/* 청약철회 안내 — 수령일이 기산점 (#124) */}
      {order.delivered_at && (
        <p className="mt-8 text-xs text-wabi-fg-muted">
          교환·환불 요청은 {withdrawalDeadlineKST(order.delivered_at)}까지
          가능합니다.{" "}
          <Link href="/legal/refund" className="underline hover:text-wabi-fg">
            교환·환불 안내 보기
          </Link>
        </p>
      )}

      {/* 배송 전(paid) 주문만 취소 가능 (#57) */}
      {order.status === "paid" && (
        <div className="mt-8 border-t border-wabi-border pt-6">
          <CancelOrderButton orderId={order.id} />
        </div>
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
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </div>
  );
}

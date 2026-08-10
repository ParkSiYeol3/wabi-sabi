"use client";

import { useState } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/product/price";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { formatDateKST, trackingSearchUrl } from "@/lib/orders";
import { lookupGuestOrder, type GuestOrder } from "./actions";

// 비회원 주문조회 — 주문번호 + 전화번호로 게스트 주문을 확인한다(계정 불필요).
// 클라이언트 폼 → 서버 액션(admin, 스로틀). 회원 주문은 여기서 조회되지 않는다.
export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<GuestOrder | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await lookupGuestOrder({ orderNumber, phone });
      if (res.ok) setOrder(res.order);
      else setError(res.error);
    } catch {
      setError("조회에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">비회원 주문조회</h1>
      <p className="mt-3 text-sm text-wabi-fg-muted">
        주문 시 입력하신 주문번호와 전화번호로 주문 내역을 확인하실 수 있습니다.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid max-w-md gap-4"
        aria-label="비회원 주문조회"
      >
        <label className="grid gap-1.5 text-sm">
          <span className="text-wabi-fg-muted">주문번호</span>
          <Input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="예: WSB1AB2C3D"
            autoComplete="off"
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-wabi-fg-muted">전화번호</span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="주문 시 입력한 전화번호"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90"
        >
          {loading ? "조회 중…" : "조회하기"}
        </Button>
      </form>

      {order && (
        <section className="mt-12 max-w-2xl border-t border-wabi-border pt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-wide text-wabi-fg-muted">
                주문번호 {order.order_number}
              </p>
              <p className="mt-1 text-sm text-wabi-fg-muted">
                {formatDateKST(order.ordered_at)} 주문
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <ul className="mt-6 divide-y divide-wabi-border/60">
            {order.order_items.map((it, i) => (
              <li key={i} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm">
                    {it.product_name} × {it.quantity}
                  </span>
                  <Price
                    value={it.price * it.quantity}
                    className="text-sm text-wabi-fg-muted"
                  />
                </div>
                {(it.addons ?? []).map((a) => (
                  <div
                    key={a.code}
                    className="mt-1 flex items-baseline justify-between gap-4 pl-3 text-xs text-wabi-fg-muted"
                  >
                    <span>+ {a.name}</span>
                    <Price value={a.price} className="text-xs" />
                  </div>
                ))}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between border-t border-wabi-border pt-4 text-sm text-wabi-fg-muted">
            <span>배송비</span>
            {order.shipping_fee > 0 ? (
              <Price value={order.shipping_fee} />
            ) : (
              <span>무료</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">결제금액</span>
            <Price value={order.total_price} className="text-base font-semibold" />
          </div>

          <dl className="mt-8 grid gap-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-wabi-fg-muted">받는 분</dt>
              <dd>{order.recipient}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-wabi-fg-muted">배송지</dt>
              <dd>{order.address}</dd>
            </div>
            {order.delivery_memo && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-wabi-fg-muted">배송 메모</dt>
                <dd>{order.delivery_memo}</dd>
              </div>
            )}
            {order.tracking_number && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-wabi-fg-muted">송장번호</dt>
                <dd>
                  {order.tracking_number}{" "}
                  <a
                    href={trackingSearchUrl(order.tracking_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline underline-offset-2"
                  >
                    배송조회
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </Container>
  );
}

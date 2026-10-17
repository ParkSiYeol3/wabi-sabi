import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  won,
  formatDateKST,
  displayStatus,
  KST,
  daysSinceShipped,
  DELIVERY_CHECK_DAYS,
  AUTO_DELIVER_DAYS,
  courierOf,
} from "@/lib/orders";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { PageHeader, TablePanel, EmptyState } from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import { AdminCancelOrderButton } from "@/components/admin/admin-cancel-order-button";
import { AdminDeleteOrderButton } from "@/components/admin/admin-delete-order-button";
import {
  AdminPartialCancelButton,
  AdminRetryRefundButton,
} from "@/components/admin/admin-partial-cancel-button";
import { markDelivered, markPreparing } from "./actions";
import { EpostCheckButton } from "@/components/admin/epost-check-button";
import { traceSource } from "@/lib/courier-trace";
import { TrackingForm } from "@/components/admin/tracking-form";
import { formatPhone } from "@/lib/phone";

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  price: number;
  // 남은 수량. 품절 취소(#844)된 수량은 cancelled_quantity 에.
  quantity: number;
  cancelled_quantity: number;
  options: { name: string; value: string }[] | null;
  addons: { code: string; name: string; price: number }[] | null;
  // 어떤 그릇인지 사진으로(대표님 2026-10-02) — 상품 대표 사진. 삭제된 상품이면 null.
  products: { images: unknown } | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  recipient: string;
  // 배송지(대표님 2026-10-02 — 첫 주문에 주소가 안 보였다). 주문 시점에 저장된 값.
  phone: string;
  address: string;
  delivery_memo: string | null;
  preparing_at: string | null;
  ordered_at: string;
  tracking_number: string | null;
  courier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  // 품절 취소(#844)로 환불한 누계. total_price 는 남은 결제 금액.
  refunded_amount: number;
  // 발송 시 무엇을·어떤 옵션(색상 등)으로 보낼지 대표님이 바로 보게(0048).
  order_items: OrderItem[];
  // 품절 취소 기록 — refunded_at 이 비면 토스 환불 미확인(다시 시도 버튼).
  order_partial_cancels: PartialCancel[];
};

type PartialCancel = {
  id: string;
  product_name: string;
  quantity: number;
  amount: number;
  refunded_at: string | null;
};

// 배송완료로 넘길 수 있는 상태 (#124) — 취소·미결제 주문은 대상이 아니다.
const CAN_DELIVER = ["paid", "shipping"];
// 택배 조회 버튼(#815·#818): 자동 조회되는 택배사(우체국, 키가 있으면 CJ·한진·롯데·로젠)의
// 송장이 있는 배송 중 주문.
const canCheckEpost = (o: Order) =>
  o.status === "shipping" && !!o.tracking_number && traceSource(o.courier) !== null;

// 배송완료 확인 알림(#778): 발송 후 DELIVERY_CHECK_DAYS 지나도 배송 중이면 버튼 위에 한 줄.
// 자동 조회되는 주문은 배달완료가 뜨면 바뀌고, 아니면 발송 AUTO_DELIVER_DAYS 째 크론이
// 바꾼다(#823). 그 전까진 누르기 전엔 배송 중이다(손님 화면·청약철회 기산점).
function DeliveryCheckHint({ o, nowMs }: { o: Order; nowMs: number }) {
  if (o.status !== "shipping") return null;
  const days = daysSinceShipped(o, nowMs);
  if (days < DELIVERY_CHECK_DAYS) return null;
  return (
    <>
      <p className="text-xs font-medium text-amber-800">
        발송 {days}일 지남 · 도착했으면 눌러 주세요
      </p>
      {!canCheckEpost(o) && (
        <p className="text-xs text-wabi-fg-muted">발송 {AUTO_DELIVER_DAYS}일째 자동 완료</p>
      )}
    </>
  );
}

async function loadOrders() {
  const { data } = await createAdminClient()
    .from("orders")
    .select(
      "id, order_number, status, total_price, recipient, phone, address, delivery_memo, preparing_at, ordered_at, tracking_number, courier, shipped_at, delivered_at, refunded_amount, order_items(id, product_id, product_name, price, quantity, cancelled_quantity, options, addons, products(images)), order_partial_cancels(id, product_name, quantity, amount, refunded_at)",
    )
    .order("ordered_at", { ascending: false })
    .returns<Order[]>();
  // 경과 일수 기준 시각(렌더 중 Date.now 는 순수성 규칙 위반이라 여기서).
  return { orders: data, nowMs: Date.now() };
}

function thumbOf(it: OrderItem): string | null {
  const imgs = it.products?.images;
  return Array.isArray(imgs) && typeof imgs[0] === "string" ? imgs[0] : null;
}

// 주문 시각 — 날짜만으론 같은 날 주문 순서를 못 가린다.
function orderedAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: KST,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// 발송 품목 — 사진 + 상품명 ×수량 + 고른 옵션(색상 등)·추가옵션. 표·카드 공용.
// 결제 완료(배송 전) 주문은 줄마다 '품절 취소'(#844). 주문에 상품이 1개는 남아야 해서
// 취소 가능 수량은 (주문 전체 남은 수량 − 1)까지. 전부 취소된 줄은 지운 줄로 남긴다.
function ItemsList({ o }: { o: Order }) {
  const items = o.order_items ?? [];
  const totalUnits = items.reduce((n, it) => n + it.quantity, 0);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => {
        const thumb = thumbOf(it);
        const maxCancel = Math.min(it.quantity, totalUnits - 1);
        return (
          <li key={i} className="flex items-start gap-2.5 leading-tight">
            <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-wabi-muted">
              {thumb ? (
                <Image
                  src={thumb}
                  alt=""
                  aria-hidden
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <ImageIcon
                  className="size-4 text-wabi-fg-muted/40"
                  strokeWidth={1}
                  aria-hidden
                />
              )}
            </span>
            <div className="min-w-0 break-keep">
              <span className={it.quantity === 0 ? "text-wabi-fg-muted line-through" : undefined}>
                {it.product_name}
                <span className="text-wabi-fg-muted"> × {it.quantity || it.cancelled_quantity}</span>
              </span>
              {it.cancelled_quantity > 0 && (
                <span className="block text-xs text-red-700">
                  품절 취소 {it.cancelled_quantity}개
                </span>
              )}
              {it.options && it.options.length > 0 && (
                <span className="block text-xs text-wabi-accent">
                  {it.options
                    .map((op) => `${op.name}: ${op.value}`)
                    .join(" · ")}
                </span>
              )}
              {it.addons && it.addons.length > 0 && (
                <span className="block text-xs text-wabi-fg-muted">
                  + {it.addons.map((a) => a.name).join(", ")}
                </span>
              )}
              {o.status === "paid" && maxCancel >= 1 && (
                <AdminPartialCancelButton
                  orderId={o.id}
                  orderNumber={o.order_number}
                  itemId={it.id}
                  productName={it.product_name}
                  unitPrice={it.price}
                  quantity={it.quantity}
                  addonTotal={(it.addons ?? []).reduce((n, a) => n + a.price, 0)}
                  maxCancel={maxCancel}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// 품절 취소 환불(#844) — 누계, 그리고 토스 환불이 확인되지 않은 기록마다 '다시 시도'.
function RefundInfo({ o }: { o: Order }) {
  const pending = (o.order_partial_cancels ?? []).filter((c) => !c.refunded_at);
  if (o.refunded_amount <= 0 && pending.length === 0) return null;
  return (
    <div className="mt-1 space-y-1.5 text-xs whitespace-normal">
      {o.refunded_amount > 0 && (
        <p className="text-red-700">품절 취소 −{won(o.refunded_amount)}</p>
      )}
      {pending.map((c) => (
        <div key={c.id} className="space-y-1">
          <p className="text-amber-800">
            {c.product_name} × {c.quantity} 환불 미확인
          </p>
          <AdminRetryRefundButton cancelId={c.id} label={won(c.amount)} />
        </div>
      ))}
    </div>
  );
}

// 받는분·연락처·배송지·메모 — 발송에 필요한 전부. 연락처는 휴대폰에서 바로 전화.
function ShipTo({ o }: { o: Order }) {
  return (
    <div className="space-y-0.5 text-sm">
      <p>
        {o.recipient}
        <a
          href={`tel:${o.phone.replace(/[^0-9+]/g, "")}`}
          className="ml-2 text-xs text-wabi-fg-muted lining-nums tabular-nums underline-offset-2 hover:text-wabi-fg hover:underline"
        >
          {formatPhone(o.phone)}
        </a>
      </p>
      <p className="break-keep text-wabi-fg">{o.address}</p>
      {o.delivery_memo && (
        <p className="break-keep text-xs text-wabi-fg-muted">
          메모: {o.delivery_memo}
        </p>
      )}
    </div>
  );
}

// 상태 + "상품 준비 중으로"(0071) — 결제 완료이고 아직 준비 전일 때만. 누르면 손님이
// 마이페이지에서 취소할 수 없다(관리자 취소는 가능).
function StatusCell({ o }: { o: Order }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <OrderStatusBadge status={displayStatus(o)} />
      {o.status === "paid" && !o.preparing_at && (
        <form action={markPreparing}>
          <input type="hidden" name="id" value={o.id} />
          <SubmitButton
            pendingText="처리 중…"
            className="cursor-pointer rounded-lg border border-wabi-border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50"
          >
            상품 준비 중으로
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

export default async function AdminOrdersPage() {
  if (!adminConfigured()) {
    // service_role 없으면 RLS로 타인 주문 조회 불가 — 안내만
    return (
      <>
        <PageHeader title="주문 관리" />
        <EmptyState>
          주문 관리는 <code>SUPABASE_SERVICE_ROLE_KEY</code> 설정 후 이용
          가능합니다.
        </EmptyState>
      </>
    );
  }

  await createClient(); // 가드(레이아웃)에서 인증 확인됨
  const { orders, nowMs } = await loadOrders();

  return (
    <>
      <PageHeader
        title="주문 관리"
        description="상품 준비 중(손님 취소 막기)·품절 취소(배송 전, 그 상품 금액만 환불)·송장 입력·배송완료·취소(배송 전 전액 환불)·기록 삭제. 최신 주문 순."
      />
      {!orders || orders.length === 0 ? (
        <EmptyState>주문이 없습니다.</EmptyState>
      ) : (
        <>
          {/* 넓은 화면(xl↑) — 표. 그보다 좁으면 카드(아래). 표가 8칸(1306px)일 때는
              어떤 폭에서도 들어갈 자리(최대 1086px)보다 넓어 오른쪽 버튼이 가로 스크롤
              밖으로 밀리고 좁게 눌려 글자가 세로로 쪼개졌다(#781). 6칸으로 줄였다. */}
          <div className="hidden xl:block">
            <TablePanel>
              <table className="w-full text-sm">
                <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">주문·상태</th>
                    <th className="px-4 py-3 font-medium">상품</th>
                    <th className="px-4 py-3 font-medium">받는분·배송지</th>
                    <th className="px-4 py-3 font-medium">금액</th>
                    <th className="px-4 py-3 font-medium">송장</th>
                    <th className="px-4 py-3 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wabi-border">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="transition-colors hover:bg-wabi-muted/40"
                    >
                      <td className="px-4 py-3 align-top lining-nums tabular-nums">
                        <span className="font-medium">{o.order_number}</span>
                        <span className="mb-2 block text-xs text-wabi-fg-muted">
                          {orderedAt(o.ordered_at)}
                        </span>
                        <StatusCell o={o} />
                      </td>
                      {/* 사진이 폭을 먹어 상품명이 두세 글자씩 꺾였다(10/2) — 칸 최소 폭 */}
                      <td className="min-w-56 px-4 py-3 align-top">
                        <ItemsList o={o} />
                      </td>
                      <td className="max-w-48 px-4 py-3 align-top">
                        <ShipTo o={o} />
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap lining-nums tabular-nums">
                        {won(o.total_price)}
                        <RefundInfo o={o} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <TrackingForm order={o} stacked />
                      </td>
                      {/* 처리: 배송완료 → 취소·환불(배송 전 paid만) → 기록 삭제(모든 상태).
                          세로로 쌓고 버튼은 한 줄 고정. 취소는 RPC 가 paid 만 받아 그 외엔
                          숨긴다. 삭제는 결제와 무관하게 기록만 지운다(대표님). */}
                      <td className="w-40 px-4 py-3 align-top">
                        <div className="flex flex-col items-start gap-1.5">
                        {o.delivered_at ? (
                          <span className="text-xs text-wabi-fg-muted">
                            {formatDateKST(o.delivered_at)} 수령
                          </span>
                        ) : CAN_DELIVER.includes(o.status) ? (
                          <form action={markDelivered} className="flex flex-col items-start gap-1.5">
                            <DeliveryCheckHint o={o} nowMs={nowMs} />
                            <input type="hidden" name="id" value={o.id} />
                            <SubmitButton
                              pendingText="처리 중…"
                              className="cursor-pointer rounded-lg border border-wabi-border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50"
                            >
                              배송완료 처리
                            </SubmitButton>
                          </form>
                        ) : null}
                          {!o.delivered_at && canCheckEpost(o) && (
                            <EpostCheckButton orderId={o.id} label={courierOf(o.courier).label} />
                          )}
                          {o.status === "paid" && (
                            <AdminCancelOrderButton
                              orderId={o.id}
                              orderNumber={o.order_number}
                            />
                          )}
                          <AdminDeleteOrderButton
                            orderId={o.id}
                            orderNumber={o.order_number}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </div>

          {/* 모바일(md 미만) — 카드. 표의 오른쪽 열(상태·송장·배송완료·취소)이
              가로스크롤 밖으로 밀려 안 보이던 문제 해결. 액션은 세로로 쌓아 터치. */}
          <ul className="grid gap-3 lg:grid-cols-2 lg:items-start xl:hidden">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-wabi-border bg-wabi-bg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="lining-nums tabular-nums">
                    <span className="font-medium">{o.order_number}</span>
                    <span className="ml-2 text-xs text-wabi-fg-muted">
                      {orderedAt(o.ordered_at)}
                    </span>
                  </span>
                  <OrderStatusBadge status={displayStatus(o)} />
                </div>

                <div className="mt-3 text-sm">
                  <ItemsList o={o} />
                </div>

                <div className="mt-3 border-t border-wabi-border pt-3">
                  <ShipTo o={o} />
                </div>

                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-wabi-fg-muted">금액</dt>
                    <dd className="text-right lining-nums tabular-nums">
                      {won(o.total_price)}
                      <RefundInfo o={o} />
                    </dd>
                  </div>
                </dl>

                {/* 액션 — 송장·배송완료·취소. 가로 꽉 채워 터치 타깃 확보. */}
                <div className="mt-3 space-y-2 border-t border-wabi-border pt-3">
                  {o.status === "paid" && !o.preparing_at && (
                    <form action={markPreparing}>
                      <input type="hidden" name="id" value={o.id} />
                      <SubmitButton
                        pendingText="처리 중…"
                        className="w-full cursor-pointer rounded-lg border border-wabi-fg px-2.5 py-2.5 text-xs transition-colors hover:bg-wabi-muted/50"
                      >
                        상품 준비 중으로 (손님 취소 막기)
                      </SubmitButton>
                    </form>
                  )}
                  <TrackingForm order={o} />

                  {o.delivered_at ? (
                    <p className="text-xs text-wabi-fg-muted">
                      {formatDateKST(o.delivered_at)} 수령 완료
                    </p>
                  ) : CAN_DELIVER.includes(o.status) ? (
                    <form action={markDelivered} className="space-y-1.5">
                      <DeliveryCheckHint o={o} nowMs={nowMs} />
                      <input type="hidden" name="id" value={o.id} />
                      <SubmitButton
                        pendingText="처리 중…"
                        className="w-full cursor-pointer rounded-lg border border-wabi-border px-2.5 py-2.5 text-xs transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50"
                      >
                        배송완료 처리
                      </SubmitButton>
                    </form>
                  ) : null}
                  {!o.delivered_at && canCheckEpost(o) && (
                    <EpostCheckButton orderId={o.id} label={courierOf(o.courier).label} fullWidth />
                  )}

                  {o.status === "paid" && (
                    <AdminCancelOrderButton
                      orderId={o.id}
                      orderNumber={o.order_number}
                      fullWidth
                    />
                  )}
                  <AdminDeleteOrderButton
                    orderId={o.id}
                    orderNumber={o.order_number}
                    fullWidth
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

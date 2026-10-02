import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  won,
  formatDateKST,
  trackingSearchUrl,
  displayStatus,
  KST,
} from "@/lib/orders";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { PageHeader, TablePanel, EmptyState } from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import { AdminCancelOrderButton } from "@/components/admin/admin-cancel-order-button";
import { AdminDeleteOrderButton } from "@/components/admin/admin-delete-order-button";
import { setTracking, markDelivered, markPreparing } from "./actions";

type OrderItem = {
  product_id: string | null;
  product_name: string;
  quantity: number;
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
  delivered_at: string | null;
  // 발송 시 무엇을·어떤 옵션(색상 등)으로 보낼지 대표님이 바로 보게(0048).
  order_items: OrderItem[];
};

// 배송완료로 넘길 수 있는 상태 (#124) — 취소·미결제 주문은 대상이 아니다.
const CAN_DELIVER = ["paid", "shipping"];

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
function ItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="space-y-2">
      {(items ?? []).map((it, i) => {
        const thumb = thumbOf(it);
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
            <span className="min-w-0 break-keep">
              <span>
                {it.product_name}
                <span className="text-wabi-fg-muted"> × {it.quantity}</span>
              </span>
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
            </span>
          </li>
        );
      })}
    </ul>
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
          className="ml-2 text-xs text-wabi-fg-muted tabular-nums underline-offset-2 hover:text-wabi-fg hover:underline"
        >
          {o.phone}
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

// 송장 입력 폼 — 표 셀·모바일 카드 공용(모바일은 입력칸이 남는 폭을 채운다).
function TrackingForm({ o }: { o: Order }) {
  return (
    <form action={setTracking} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={o.id} />
      <input
        name="tracking_number"
        defaultValue={o.tracking_number ?? ""}
        aria-label={`주문 ${o.order_number} 송장번호`}
        placeholder="송장번호"
        className="w-36 flex-1 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-wabi-fg sm:flex-none"
      />
      <SubmitButton
        pendingText="저장 중…"
        className="cursor-pointer rounded-lg px-2 py-1.5 text-xs whitespace-nowrap text-wabi-fg-muted underline-offset-2 transition-colors hover:text-wabi-fg hover:underline"
      >
        저장
      </SubmitButton>
      {o.tracking_number && (
        <a
          href={trackingSearchUrl(o.tracking_number)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-wabi-fg-muted underline-offset-2 transition-colors hover:text-wabi-fg hover:underline"
        >
          조회<span className="sr-only"> (새 창 열림)</span>
        </a>
      )}
    </form>
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

  const db = createAdminClient();
  await createClient(); // 가드(레이아웃)에서 인증 확인됨
  const { data: orders } = await db
    .from("orders")
    .select(
      "id, order_number, status, total_price, recipient, phone, address, delivery_memo, preparing_at, ordered_at, tracking_number, delivered_at, order_items(product_id, product_name, quantity, options, addons, products(images))",
    )
    .order("ordered_at", { ascending: false })
    .returns<Order[]>();

  return (
    <>
      <PageHeader
        title="주문 관리"
        description="상품 준비 중(손님 취소 막기)·송장 입력·배송완료·취소(배송 전 전액 환불)·기록 삭제. 최신 주문 순."
      />
      {!orders || orders.length === 0 ? (
        <EmptyState>주문이 없습니다.</EmptyState>
      ) : (
        <>
          {/* 데스크톱(md↑) — 표. 좁은 화면에선 카드로 대체(아래). */}
          <div className="hidden md:block">
            <TablePanel>
              <table className="w-full min-w-200 text-sm">
                <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">주문번호</th>
                    <th className="px-4 py-3 font-medium">상품</th>
                    <th className="px-4 py-3 font-medium">받는분·배송지</th>
                    <th className="px-4 py-3 font-medium">금액</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">송장번호</th>
                    <th className="px-4 py-3 font-medium">배송완료</th>
                    <th className="px-4 py-3 font-medium">취소·삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wabi-border">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="transition-colors hover:bg-wabi-muted/40"
                    >
                      <td className="px-4 py-3 align-top tabular-nums">
                        <span className="font-medium">{o.order_number}</span>
                        <span className="block text-xs text-wabi-fg-muted">
                          {orderedAt(o.ordered_at)}
                        </span>
                      </td>
                      {/* 사진이 폭을 먹어 상품명이 두세 글자씩 꺾였다(10/2) — 칸 최소 폭 */}
                      <td className="min-w-60 px-4 py-3 align-top">
                        <ItemsList items={o.order_items} />
                      </td>
                      <td className="max-w-60 px-4 py-3 align-top">
                        <ShipTo o={o} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {won(o.total_price)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusCell o={o} />
                      </td>
                      <td className="px-4 py-3">
                        <TrackingForm o={o} />
                      </td>
                      <td className="px-4 py-3">
                        {o.delivered_at ? (
                          <span className="text-xs text-wabi-fg-muted">
                            {formatDateKST(o.delivered_at)} 수령
                          </span>
                        ) : CAN_DELIVER.includes(o.status) ? (
                          <form action={markDelivered}>
                            <input type="hidden" name="id" value={o.id} />
                            <SubmitButton
                              pendingText="처리 중…"
                              className="cursor-pointer rounded-lg border border-wabi-border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50"
                            >
                              배송완료 처리
                            </SubmitButton>
                          </form>
                        ) : (
                          <span className="text-xs text-wabi-fg-muted">—</span>
                        )}
                      </td>
                      {/* 취소·환불(배송 전 paid만) + 기록 삭제(모든 상태). 취소는
                          RPC 가 paid 만 받아 그 외엔 숨긴다. 삭제는 결제와 무관하게
                          기록만 지운다(테스트 데이터 정리·대표님). */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
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
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-wabi-border bg-wabi-bg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="tabular-nums">
                    <span className="font-medium">{o.order_number}</span>
                    <span className="ml-2 text-xs text-wabi-fg-muted">
                      {orderedAt(o.ordered_at)}
                    </span>
                  </span>
                  <OrderStatusBadge status={displayStatus(o)} />
                </div>

                <div className="mt-3 text-sm">
                  <ItemsList items={o.order_items} />
                </div>

                <div className="mt-3 border-t border-wabi-border pt-3">
                  <ShipTo o={o} />
                </div>

                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-wabi-fg-muted">금액</dt>
                    <dd className="tabular-nums">{won(o.total_price)}</dd>
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
                  <TrackingForm o={o} />

                  {o.delivered_at ? (
                    <p className="text-xs text-wabi-fg-muted">
                      {formatDateKST(o.delivered_at)} 수령 완료
                    </p>
                  ) : CAN_DELIVER.includes(o.status) ? (
                    <form action={markDelivered}>
                      <input type="hidden" name="id" value={o.id} />
                      <SubmitButton
                        pendingText="처리 중…"
                        className="w-full cursor-pointer rounded-lg border border-wabi-border px-2.5 py-2.5 text-xs transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50"
                      >
                        배송완료 처리
                      </SubmitButton>
                    </form>
                  ) : null}

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

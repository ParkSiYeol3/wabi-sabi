import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PageHeader, TablePanel, EmptyState } from "@/components/admin/ui";
import { setTracking, markDelivered } from "./actions";

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  recipient: string;
  ordered_at: string;
  tracking_number: string | null;
  delivered_at: string | null;
};

// 배송완료로 넘길 수 있는 상태 (#124) — 취소·미결제 주문은 대상이 아니다.
const CAN_DELIVER = ["paid", "shipping"];

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
      "id, order_number, status, total_price, recipient, ordered_at, tracking_number, delivered_at",
    )
    .order("ordered_at", { ascending: false })
    .returns<Order[]>();

  return (
    <>
      <PageHeader
        title="주문 관리"
        description="송장 입력·배송완료 처리. 최신 주문 순."
      />
      {!orders || orders.length === 0 ? (
        <EmptyState>주문이 없습니다.</EmptyState>
      ) : (
        <TablePanel>
          <table className="w-full min-w-200 text-sm">
            <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">주문번호</th>
                <th className="px-4 py-3 font-medium">받는분</th>
                <th className="px-4 py-3 font-medium">금액</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">송장번호</th>
                <th className="px-4 py-3 font-medium">배송완료</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-wabi-muted/40">
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {o.order_number}
                  </td>
                  <td className="px-4 py-3">{o.recipient}</td>
                  <td className="px-4 py-3 tabular-nums">{won(o.total_price)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={setTracking}
                      className="flex items-center gap-1.5"
                    >
                      <input type="hidden" name="id" value={o.id} />
                      <input
                        name="tracking_number"
                        defaultValue={o.tracking_number ?? ""}
                        aria-label={`주문 ${o.order_number} 송장번호`}
                        placeholder="송장번호"
                        className="w-36 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-wabi-fg"
                      />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-lg px-2 py-1.5 text-xs text-wabi-fg-muted underline-offset-2 transition-colors hover:text-wabi-fg hover:underline"
                      >
                        저장
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    {o.delivered_at ? (
                      <span className="text-xs text-wabi-fg-muted">
                        {formatDateKST(o.delivered_at)} 수령
                      </span>
                    ) : CAN_DELIVER.includes(o.status) ? (
                      <form action={markDelivered}>
                        <input type="hidden" name="id" value={o.id} />
                        <button
                          type="submit"
                          className="cursor-pointer rounded-lg border border-wabi-border px-2.5 py-1.5 text-xs transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50"
                        >
                          배송완료 처리
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-wabi-fg-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}
    </>
  );
}

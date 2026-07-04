import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { createClient } from "@/lib/supabase/server";
import { statusLabel, won } from "@/lib/orders";

export const metadata: Metadata = { title: "주문 내역" };

type OrderItem = { product_name: string; quantity: number };
type Order = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  ordered_at: string;
  order_items: OrderItem[];
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/mypage/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total_price, ordered_at, order_items(product_name, quantity)",
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
            return (
              <li
                key={o.id}
                className="border border-wabi-border p-5 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.order_number}</span>
                  <span className="text-xs text-wabi-fg-muted">
                    {statusLabel(o.status)}
                  </span>
                </div>
                <p className="mt-2 text-wabi-fg-muted">
                  {new Date(o.ordered_at).toLocaleDateString("ko-KR")}
                </p>
                <p className="mt-2">
                  {first?.product_name}
                  {first && first.quantity > 1 ? ` ${first.quantity}개` : ""}
                  {rest > 0 ? ` 외 ${rest}건` : ""}
                </p>
                <p className="mt-2 font-medium">{won(o.total_price)}</p>
                {o.status === "paid" && (
                  <div className="mt-3 border-t border-wabi-border pt-3">
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

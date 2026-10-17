import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-url";
import { firstImage } from "./layout";
import { orderRecipientEmail } from "./recipient";
import { notifyShop } from "./shop-notify";
import {
  orderCancelledMail,
  orderPartialCancelledMail,
  shopAlertMail,
  type CancelCause,
} from "./templates";

// 주문 취소·환불 안내(#780). 손님 취소·관리자 취소·결제 중 재고 소진 자동 취소.
// 중복 방지는 호출하는 쪽(lib/payments)이 맡는다: 최초 취소이거나 실제로 환불된 때만 부른다.

type Row = {
  order_number: string;
  total_price: number;
  user_id: string | null;
  guest_email: string | null;
  order_items: {
    product_name: string;
    quantity: number;
    options: { name: string; value: string }[] | null;
    products: { images: unknown } | null;
  }[];
};

export async function sendOrderCancelledMail(
  orderId: string,
  cause: CancelCause,
): Promise<void> {
  if (!adminConfigured()) return;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, total_price, user_id, guest_email, order_items(product_name, quantity, options, products(images))",
    )
    .eq("id", orderId)
    .maybeSingle<Row>();
  if (!order) return;

  const to = await orderRecipientEmail(admin, order);
  if (!to) return;

  await sendMail({
    to,
    ...orderCancelledMail({
      orderNumber: order.order_number,
      cause,
      // 부분취소(#844) 뒤의 전체 취소면 total_price 가 이미 남은 금액이고, 전부 취소된
      // 줄(수량 0)은 앞서 부분취소 메일로 안내했으니 뺀다.
      refundAmount: order.total_price,
      items: order.order_items.filter((it) => it.quantity > 0).map((it) => ({
        name: it.product_name,
        quantity: it.quantity,
        image: firstImage(it.products?.images),
        details: (it.options ?? []).map((op) => `${op.name}: ${op.value}`),
      })),
    }),
  });
}

// 주문은 취소됐는데 토스 환불이 실패한 경우: 손님에겐 "환불됩니다" 메일을 보내지 않고
// 대표님께 수동 환불을 요청한다(서버 로그만으로는 아무도 못 본다).
export async function notifyRefundFailed(orderId: string, why: string): Promise<void> {
  if (!adminConfigured()) return;
  const { data: order } = await createAdminClient()
    .from("orders")
    .select("order_number, total_price")
    .eq("id", orderId)
    .maybeSingle<{ order_number: string; total_price: number }>();
  await notifyShop(
    shopAlertMail({
      subject: `수동 환불 필요 (${order?.order_number ?? orderId})`,
      title: "주문은 취소됐는데 환불이 되지 않았습니다",
      intro: "토스페이먼츠 상점관리자에서 이 주문의 결제를 직접 취소해 주세요. 손님에게는 아직 안내 메일이 가지 않았습니다.",
      rows: [
        ["주문번호", order?.order_number ?? orderId],
        ["금액", order ? `${order.total_price.toLocaleString("ko-KR")}원` : "-"],
        ["원인", why],
      ],
      action: { href: `${SITE_URL}/admin/orders`, label: "주문 관리 열기" },
    }),
  );
}

// 부분취소(품절) 안내(#844) — 토스 환불이 확인된 기록 하나당 1회. 호출하는 쪽(lib/payments)이
// 환불 확인 시점(refunded_at 이 처음 찍힐 때)에만 부른다.
type PartialRow = {
  order_item_id: string;
  quantity: number;
  amount: number;
  product_name: string;
  orders: {
    order_number: string;
    total_price: number;
    user_id: string | null;
    guest_email: string | null;
  } | null;
};

export async function sendPartialCancelMail(cancelId: string): Promise<void> {
  if (!adminConfigured()) return;
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("order_partial_cancels")
    .select(
      "order_item_id, quantity, amount, product_name, orders(order_number, total_price, user_id, guest_email)",
    )
    .eq("id", cancelId)
    .maybeSingle<PartialRow>();
  if (!c?.orders) return;
  // 줄은 FK 없이 id 로 따로 읽는다(0081 주석: 연결 표 오인 방지).
  const { data: line } = await admin
    .from("order_items")
    .select("options, products(images)")
    .eq("id", c.order_item_id)
    .maybeSingle<{
      options: { name: string; value: string }[] | null;
      products: { images: unknown } | null;
    }>();

  const to = await orderRecipientEmail(admin, c.orders);
  if (!to) return;

  await sendMail({
    to,
    ...orderPartialCancelledMail({
      orderNumber: c.orders.order_number,
      refundAmount: c.amount,
      remainingAmount: c.orders.total_price,
      items: [
        {
          name: c.product_name,
          quantity: c.quantity,
          image: firstImage(line?.products?.images),
          details: (line?.options ?? []).map((op) => `${op.name}: ${op.value}`),
        },
      ],
    }),
  });
}

// 부분취소는 처리됐는데 토스 환불이 안 된 경우(#844). 전체 취소용 알림(notifyRefundFailed)은
// "결제를 직접 취소해 주세요"라 부분취소엔 맞지 않는다(전액이 나간다). 이 금액만 환불하도록 안내.
export async function notifyPartialRefundFailed(
  cancelId: string,
  why: string,
): Promise<void> {
  if (!adminConfigured()) return;
  const { data: c } = await createAdminClient()
    .from("order_partial_cancels")
    .select("product_name, quantity, amount, orders(order_number)")
    .eq("id", cancelId)
    .maybeSingle<{
      product_name: string;
      quantity: number;
      amount: number;
      orders: { order_number: string } | null;
    }>();
  await notifyShop(
    shopAlertMail({
      subject: `부분취소 환불 확인 필요 (${c?.orders?.order_number ?? cancelId})`,
      title: "부분취소한 상품의 환불이 되지 않았습니다",
      intro:
        "주문 관리에서 이 주문의 '환불 다시 시도'를 눌러 주세요. 계속 안 되면 토스페이먼츠 상점관리자에서 아래 금액만 부분취소해 주세요(전체 취소 아님). 손님에게는 아직 안내 메일이 가지 않았습니다.",
      rows: [
        ["주문번호", c?.orders?.order_number ?? "-"],
        ["상품", c ? `${c.product_name} × ${c.quantity}` : "-"],
        ["환불할 금액", c ? `${c.amount.toLocaleString("ko-KR")}원` : "-"],
        ["원인", why],
      ],
      action: { href: `${SITE_URL}/admin/orders`, label: "주문 관리 열기" },
    }),
  );
}

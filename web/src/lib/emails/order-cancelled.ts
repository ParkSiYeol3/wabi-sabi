import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-url";
import { firstImage } from "./layout";
import { orderRecipientEmail } from "./recipient";
import { notifyShop } from "./shop-notify";
import { orderCancelledMail, shopAlertMail, type CancelCause } from "./templates";

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
      refundAmount: order.total_price,
      items: order.order_items.map((it) => ({
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

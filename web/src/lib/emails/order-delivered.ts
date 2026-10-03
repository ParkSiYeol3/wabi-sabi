import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-url";
import { firstImage } from "./layout";
import { orderRecipientEmail } from "./recipient";
import { orderDeliveredMail } from "./templates";

// 배송 완료 + 리뷰 요청(#783). 관리자 배송완료 처리(markDelivered)가 실제로 상태를
// 바꾼 때만 호출된다(이미 완료된 주문은 0행이라 여기 오지 않는다 → 1회).

type Row = {
  order_number: string;
  delivered_at: string | null;
  user_id: string | null;
  order_items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    options: { name: string; value: string }[] | null;
    // 판매 중지·삭제면 null(products 공개 읽기 = is_active 와 무관하게 service_role 은 읽는다).
    products: { images: unknown; is_active: boolean } | null;
  }[];
};

// 리뷰 버튼 목적지: 판매 중인 상품이 1종이면 그 상품 리뷰 칸, 여러 종이면 마이페이지 주문
// 내역(상품 줄마다 리뷰 버튼, #771). 비회원은 리뷰를 쓸 수 없어(로그인 필요) null.
function reviewHref(o: Row): string | null {
  if (!o.user_id) return null;
  const ids = [
    ...new Set(
      o.order_items
        .filter((it) => it.product_id && it.products?.is_active)
        .map((it) => it.product_id as string),
    ),
  ];
  if (ids.length === 0) return null;
  return ids.length === 1
    ? `${SITE_URL}/shop/${encodeURIComponent(ids[0])}#reviews`
    : `${SITE_URL}/mypage/orders`;
}

export async function sendOrderDeliveredMail(orderId: string): Promise<void> {
  if (!adminConfigured()) return;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, delivered_at, user_id, order_items(product_id, product_name, quantity, options, products(images, is_active))",
    )
    .eq("id", orderId)
    .maybeSingle<Row>();
  if (!order?.delivered_at) return;

  const to = await orderRecipientEmail(admin, order);
  if (!to) return;

  await sendMail({
    to,
    ...orderDeliveredMail({
      orderNumber: order.order_number,
      deliveredAt: order.delivered_at,
      reviewHref: reviewHref(order),
      items: order.order_items.map((it) => ({
        name: it.product_name,
        quantity: it.quantity,
        image: firstImage(it.products?.images),
        details: (it.options ?? []).map((op) => `${op.name}: ${op.value}`),
      })),
    }),
  });
}

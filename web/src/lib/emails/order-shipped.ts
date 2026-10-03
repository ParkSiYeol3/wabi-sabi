import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { firstImage } from "./layout";
import { orderRecipientEmail } from "./recipient";
import { orderShippedMail } from "./templates";

// 배송 시작 메일 (#129) — 송장이 등록돼도 고객에게 알림이 가지 않았다.
// 어드민이 송장을 실제로 저장했을 때(처음 입력·번호 변경, #746)만 호출된다.
// 본문은 templates.ts(#748 — 배송 조회 버튼·보낸 상품 사진·택배사). 택배사는 주문에 저장된 값(#756).

export async function sendOrderShippedMail(
  orderId: string,
  trackingNumber: string,
): Promise<void> {
  if (!adminConfigured()) return;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, courier, recipient, address, user_id, guest_email, order_items(product_name, quantity, options, products(images))",
    )
    .eq("id", orderId)
    .maybeSingle<{
      order_number: string;
      courier: string | null;
      recipient: string;
      address: string;
      user_id: string | null;
      guest_email: string | null;
      order_items: {
        product_name: string;
        quantity: number;
        options: { name: string; value: string }[] | null;
        products: { images: unknown } | null;
      }[];
    }>();

  if (!order) return;

  // 회원 = 계정 이메일, 비회원 = 선택 이메일(#787). 없으면 보내지 않는다.
  const to = await orderRecipientEmail(admin, order);
  if (!to) return;

  await sendMail({
    to,
    ...orderShippedMail({
      orderNumber: order.order_number,
      courier: order.courier,
      trackingNumber,
      recipient: order.recipient,
      address: order.address,
      items: (order.order_items ?? []).map((it) => ({
        name: it.product_name,
        quantity: it.quantity,
        image: firstImage(it.products?.images),
        details: (it.options ?? []).map((op) => `${op.name}: ${op.value}`),
      })),
    }),
  });
}

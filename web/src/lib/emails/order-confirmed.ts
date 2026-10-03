import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { firstImage } from "./layout";
import { orderRecipientEmail } from "./recipient";
import { orderConfirmedMail } from "./templates";

// 주문 확인 메일 (#129) — 결제 완료 후 고객에게 아무 통지도 가지 않던 문제.
// 전자상거래법 §13 은 계약 내용에 관한 서면(전자문서 포함) 교부를 요구한다.
//
// 호출 지점은 confirm_order_paid 가 'confirmed' 를 반환한 **최초 확정 1회**뿐이다
// (성공 페이지·웹훅이 동시에 확정을 시도해도 두 번 보내지 않는다 — payments.ts 참고).

type Row = {
  order_number: string;
  total_price: number;
  shipping_fee: number;
  recipient: string;
  address: string;
  ordered_at: string;
  user_id: string | null;
  guest_email: string | null;
  order_items: {
    product_name: string;
    quantity: number;
    price: number;
    // 애드온 스냅샷(주문 시점 이름·가격 고정, 0034). 없으면 null.
    addons: { code: string; name: string; price: number }[] | null;
    // 커스텀 옵션 스냅샷(색상·모양 등, 0048). 대표님이 어떤 걸 보낼지 안다.
    options: { name: string; value: string }[] | null;
    // 상품 사진(#748). 상품이 삭제됐으면 null.
    products: { images: unknown } | null;
  }[];
};

// 본문은 templates.ts(#748). 옵션·애드온은 상품 아래 작은 줄로, 금액은 상품가×수량.
function mail(o: Row) {
  return orderConfirmedMail({
    orderNumber: o.order_number,
    orderedAt: o.ordered_at,
    recipient: o.recipient,
    address: o.address,
    shippingFee: o.shipping_fee,
    total: o.total_price,
    items: o.order_items.map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      image: firstImage(i.products?.images),
      price: won(i.price * i.quantity),
      details: [
        ...(i.options ?? []).map((op) => `${op.name}: ${op.value}`),
        ...(i.addons ?? []).map((ad) => `+ ${ad.name} ${won(ad.price)}`),
      ],
    })),
  });
}

export async function sendOrderConfirmedMail(orderId: string): Promise<void> {
  if (!adminConfigured()) return;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, total_price, shipping_fee, recipient, address, ordered_at, user_id, guest_email, order_items(product_name, quantity, price, addons, options, products(images))",
    )
    .eq("id", orderId)
    .maybeSingle<Row>();

  if (!order) return;

  // 받는 주소: 회원 = 계정 이메일, 비회원 = 결제 때 선택으로 남긴 이메일(#787).
  // 비회원이 이메일을 비웠으면 보내지 않는다(주문 조회는 주문번호·연락처로).
  const to = await orderRecipientEmail(admin, order);
  if (!to) return;

  await sendMail({ to, ...mail(order) });
}

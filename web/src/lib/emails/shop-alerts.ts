import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { SITE_URL } from "@/lib/site-url";
import { notifyShop } from "./shop-notify";
import { shopAlertMail } from "./templates";

// 대표님께 새 주문·새 문의 알림(#785). 어드민을 열어 봐야만 알던 것(첫 실주문은 결제 후
// 첫 관리자 작업까지 약 6시간). 알림 실패는 결제·문의 등록을 막지 않는다(notifyShop).

type OrderRow = {
  order_number: string;
  total_price: number;
  user_id: string | null;
  order_items: { product_name: string; quantity: number; price: number }[];
};

export async function notifyNewOrder(orderId: string): Promise<void> {
  if (!adminConfigured()) return;
  const { data: o } = await createAdminClient()
    .from("orders")
    .select("order_number, total_price, user_id, order_items(product_name, quantity, price)")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (!o) return;

  // 상품 요약: 금액 큰 상품 + "외 N건"(마이페이지 요약과 같은 규칙).
  const items = [...o.order_items].sort((a, b) => b.price * b.quantity - a.price * a.quantity);
  const first = items[0];
  const summary = first
    ? `${first.product_name} × ${first.quantity}${items.length > 1 ? ` 외 ${items.length - 1}건` : ""}`
    : "-";

  await notifyShop(
    shopAlertMail({
      subject: `새 주문 ${won(o.total_price)} (${o.order_number})`,
      title: "새 주문이 들어왔습니다",
      intro: "결제가 완료된 주문입니다. 상품을 준비해 주세요.",
      rows: [
        ["주문번호", o.order_number],
        ["결제 금액", won(o.total_price)],
        ["상품", summary],
        ["주문자", o.user_id ? "회원" : "비회원"],
      ],
      action: { href: `${SITE_URL}/admin/orders`, label: "주문 관리 열기" },
    }),
  );
}

export async function notifyNewInquiry(i: { title: string; isSecret: boolean }): Promise<void> {
  await notifyShop(
    shopAlertMail({
      subject: "새 문의가 등록되었습니다",
      title: "새 문의가 등록되었습니다",
      intro: i.isSecret
        ? "비밀글 문의입니다. 내용은 관리자 화면에서 확인해 주세요."
        : "답변은 관리자 화면에서 남길 수 있습니다.",
      rows: [["제목", i.title]],
      action: { href: `${SITE_URL}/admin/inquiries`, label: "문의 관리 열기" },
    }),
  );
}

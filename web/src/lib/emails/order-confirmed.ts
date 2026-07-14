import { escapeHtml, sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { formatDateKST, won } from "@/lib/orders";
import { site, business } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";

// 주문 확인 메일 (#129) — 결제 완료 후 고객에게 아무 통지도 가지 않던 문제.
// 전자상거래법 §13 은 계약 내용에 관한 서면(전자문서 포함) 교부를 요구한다.
//
// 호출 지점은 confirm_order_paid 가 'confirmed' 를 반환한 **최초 확정 1회**뿐이다
// (성공 페이지·웹훅이 동시에 확정을 시도해도 두 번 보내지 않는다 — payments.ts 참고).

type Row = {
  order_number: string;
  total_price: number;
  recipient: string;
  address: string;
  ordered_at: string;
  user_id: string | null;
  order_items: { product_name: string; quantity: number; price: number }[];
};

const BASE = SITE_URL;

function html(o: Row): string {
  const items = o.order_items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(i.product_name)} × ${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${won(i.price * i.quantity)}</td>
        </tr>`,
    )
    .join("");

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;max-width:560px;margin:0 auto;color:#2b2926">
    <h1 style="font-size:18px;letter-spacing:.08em">${escapeHtml(site.name)}</h1>
    <p style="font-size:15px">주문이 정상적으로 접수되었습니다.</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:24px">
      <tr>
        <td style="padding:8px 0;color:#6f6a63">주문번호</td>
        <td style="padding:8px 0;text-align:right">${escapeHtml(o.order_number)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6f6a63">주문일시</td>
        <td style="padding:8px 0;text-align:right">${formatDateKST(o.ordered_at)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6f6a63">받는 분</td>
        <td style="padding:8px 0;text-align:right">${escapeHtml(o.recipient)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6f6a63">배송지</td>
        <td style="padding:8px 0;text-align:right">${escapeHtml(o.address)}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:24px;border-top:1px solid #2b2926">
      ${items}
      <tr>
        <td style="padding:12px 0;font-weight:600">결제 금액</td>
        <td style="padding:12px 0;text-align:right;font-weight:600">${won(o.total_price)}</td>
      </tr>
    </table>

    <p style="margin-top:28px">
      <a href="${BASE}/mypage/orders" style="color:#2b2926">주문 내역 보기</a>
    </p>

    <p style="margin-top:28px;font-size:12px;color:#8a847c;line-height:1.8">
      수공예품 특성상 색상·질감·크기에 개체별 미세한 차이가 있을 수 있습니다(하자 아님).<br>
      교환·환불은 <a href="${BASE}/legal/refund" style="color:#8a847c">교환·환불 안내</a>를 참고해 주세요.<br>
      문의: ${escapeHtml(business.email)}
    </p>
  </div>`;
}

export async function sendOrderConfirmedMail(orderId: string): Promise<void> {
  if (!adminConfigured()) return;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, total_price, recipient, address, ordered_at, user_id, order_items(product_name, quantity, price)",
    )
    .eq("id", orderId)
    .maybeSingle<Row>();

  if (!order || !order.user_id) return;

  // 수신 주소는 계정 이메일 — 주문 폼에는 이메일 입력이 없다(로그인 필수 흐름).
  const { data: authUser } = await admin.auth.admin.getUserById(order.user_id);
  const to = authUser?.user?.email;
  if (!to) {
    console.error("[email] 주문 확인 메일 — 수신 주소 없음 orderId=", orderId);
    return;
  }

  await sendMail({
    to,
    subject: `[${site.name}] 주문이 접수되었습니다 (${order.order_number})`,
    html: html(order),
  });
}

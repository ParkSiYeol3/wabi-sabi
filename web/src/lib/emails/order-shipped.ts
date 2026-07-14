import { escapeHtml, sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { site, business } from "@/lib/site";

// 배송 시작 메일 (#129) — 송장이 등록돼도 고객에게 알림이 가지 않았다.
// 어드민이 송장을 실제로 저장했을 때(변경된 행이 있을 때)만 호출된다.

const BASE = "https://wasa.kr";

export async function sendOrderShippedMail(
  orderId: string,
  trackingNumber: string,
): Promise<void> {
  if (!adminConfigured()) return;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("order_number, recipient, address, user_id")
    .eq("id", orderId)
    .maybeSingle<{
      order_number: string;
      recipient: string;
      address: string;
      user_id: string | null;
    }>();

  if (!order || !order.user_id) return;

  const { data: authUser } = await admin.auth.admin.getUserById(order.user_id);
  const to = authUser?.user?.email;
  if (!to) return;

  await sendMail({
    to,
    subject: `[${site.name}] 상품이 발송되었습니다 (${order.order_number})`,
    html: `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;max-width:560px;margin:0 auto;color:#2b2926">
      <h1 style="font-size:18px;letter-spacing:.08em">${escapeHtml(site.name)}</h1>
      <p style="font-size:15px">주문하신 상품이 발송되었습니다.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:24px">
        <tr>
          <td style="padding:8px 0;color:#6f6a63">주문번호</td>
          <td style="padding:8px 0;text-align:right">${escapeHtml(order.order_number)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6f6a63">송장번호</td>
          <td style="padding:8px 0;text-align:right">${escapeHtml(trackingNumber)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6f6a63">받는 분</td>
          <td style="padding:8px 0;text-align:right">${escapeHtml(order.recipient)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6f6a63">배송지</td>
          <td style="padding:8px 0;text-align:right">${escapeHtml(order.address)}</td>
        </tr>
      </table>

      <p style="margin-top:28px">
        <a href="${BASE}/mypage/orders" style="color:#2b2926">주문 내역 보기</a>
      </p>

      <p style="margin-top:28px;font-size:12px;color:#8a847c;line-height:1.8">
        수령 후 7일 이내 교환·환불을 요청하실 수 있습니다 —
        <a href="${BASE}/legal/refund" style="color:#8a847c">교환·환불 안내</a><br>
        문의: ${escapeHtml(business.email)}
      </p>
    </div>`,
  });
}

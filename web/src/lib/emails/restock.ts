import { escapeHtml, sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { site, business } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";

// 재입고 알림 메일 (#166) — 어드민이 재고를 0 → 양수로 바꿨을 때만 호출된다.
// 1회성: 발송한 구독은 삭제해 중복 통지를 막는다(재고가 다시 떨어지면 재구독).
// 발송 실패가 재고 저장을 되돌리지 않는다(fail-open) — 메일은 부가 기능.

const BASE = SITE_URL;

export async function sendRestockMails(productId: string): Promise<void> {
  if (!adminConfigured()) return;
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("name")
    .eq("id", productId)
    .maybeSingle<{ name: string }>();
  if (!product) return;

  const { data: subs } = await admin
    .from("restock_subscriptions")
    .select("id, user_id")
    .eq("product_id", productId)
    .returns<{ id: string; user_id: string }[]>();
  if (!subs?.length) return;

  const sentIds: string[] = [];
  for (const sub of subs) {
    try {
      // 이메일은 계정 최신값을 쓴다(구독 시점 스냅샷 저장 안 함).
      const { data: authUser } = await admin.auth.admin.getUserById(sub.user_id);
      const to = authUser?.user?.email;
      if (!to) continue;

      await sendMail({
        to,
        subject: `[${site.name}] ${product.name} 재입고 알림`,
        html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;max-width:560px;margin:0 auto;color:#2b2926">
          <h1 style="font-size:18px;letter-spacing:.08em">${escapeHtml(site.name)}</h1>
          <p style="font-size:15px">기다리시던 <strong>${escapeHtml(product.name)}</strong> 이(가) 재입고되었습니다.</p>
          <p style="font-size:14px;color:#6f6a63">수량이 한정되어 있어 조기 품절될 수 있습니다.</p>

          <p style="margin-top:28px">
            <a href="${BASE}/shop/${productId}" style="display:inline-block;background:#3b3733;color:#fff;padding:12px 24px;text-decoration:none;font-size:14px">상품 보러 가기</a>
          </p>

          <p style="margin-top:28px;font-size:12px;color:#8a847c;line-height:1.8">
            이 메일은 재입고 알림을 신청하신 분께 1회 발송됩니다.<br>
            문의: ${escapeHtml(business.email)}
          </p>
        </div>`,
      });
      sentIds.push(sub.id);
    } catch (e) {
      // 한 명 실패가 나머지 발송을 막지 않는다.
      console.error("[restock] 발송 실패", sub.user_id, e);
    }
  }

  // 발송된 구독만 해제 — 실패한 건은 남겨 다음 재입고 때 재시도된다.
  if (sentIds.length) {
    await admin.from("restock_subscriptions").delete().in("id", sentIds);
  }
}

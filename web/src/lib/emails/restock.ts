import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { firstImage } from "./layout";
import { restockMail } from "./templates";

// 재입고 알림 메일 (#166) — 어드민이 재고를 0 → 양수로 바꿨을 때만 호출된다.
// 1회성: 발송한 구독은 삭제해 중복 통지를 막는다(재고가 다시 떨어지면 재구독).
// 발송 실패가 재고 저장을 되돌리지 않는다(fail-open) — 메일은 부가 기능.
// 본문은 templates.ts(#748 — 상품 사진 포함).

export async function sendRestockMails(productId: string): Promise<void> {
  if (!adminConfigured()) return;
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("name, images")
    .eq("id", productId)
    .maybeSingle<{ name: string; images: unknown }>();
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

      // sendMail 은 실패 시 false — 반환값을 봐야 실패한 구독을 지우지 않는다.
      const sent = await sendMail({
        to,
        ...restockMail({
          productId,
          name: product.name,
          image: firstImage(product.images),
        }),
      });
      if (sent) sentIds.push(sub.id);
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

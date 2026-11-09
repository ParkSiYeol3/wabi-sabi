import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/email";
import { activeLines } from "@/lib/orders";
import { SITE_URL } from "@/lib/site-url";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { firstImage, type MailItem } from "./layout";
import { orderRecipientEmail } from "./recipient";
import { reviewReminderMail } from "./templates";

// 리뷰 요청 메일 발송(#919). /api/cron/review-reminders 가 하루 한 번 부른다.
//
// 대상: 배송완료 후 3~14일 지난 회원 주문 중 아직 처리 안 한 것(review_reminder_at 비어 있음).
//   - 마케팅 수신 동의의 최신 이력이 '동의'인 회원만. 미동의면 표시하지 않고 넘긴다(기간 안에
//     동의하면 그때 받는다).
//   - 판매 중이고 아직 리뷰를 안 쓴 상품만 담는다. 그런 상품이 없으면 처리만 표시하고 안 보낸다.
//   - 한 사람에게 여러 주문이 걸리면 메일은 한 통으로 합친다.
// 보내기 전에 주문을 먼저 표시(겹쳐 도는 실행이 두 번 보내지 않게), 발송 실패면 표시를 되돌려
// 다음 날 다시 시도한다.

const DAY = 86_400_000;
export const REMIND_AFTER_DAYS = 3;
const REMIND_UNTIL_DAYS = 14;

type Row = {
  id: string;
  user_id: string;
  order_items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    options: { name: string; value: string }[] | null;
    products: { images: unknown; is_active: boolean } | null;
  }[];
};

export type ReminderRun = { candidates: number; sent: number; skipped: number; failed: number };

export async function sendReviewReminders(
  admin: SupabaseClient,
  now: number = Date.now(),
): Promise<ReminderRun> {
  const run: ReminderRun = { candidates: 0, sent: 0, skipped: 0, failed: 0 };

  const { data: orders, error } = await admin
    .from("orders")
    .select(
      "id, user_id, order_items(product_id, product_name, quantity, options, products(images, is_active))",
    )
    .eq("status", "delivered")
    .not("user_id", "is", null)
    .is("review_reminder_at", null)
    .gte("delivered_at", new Date(now - REMIND_UNTIL_DAYS * DAY).toISOString())
    .lte("delivered_at", new Date(now - REMIND_AFTER_DAYS * DAY).toISOString())
    .returns<Row[]>();
  if (error) throw new Error(`orders: ${error.message}`);
  if (!orders?.length) return run;
  run.candidates = orders.length;

  const userIds = [...new Set(orders.map((o) => o.user_id))];

  // 마케팅 동의: 이력의 최신 행이 현재 값(lib/queries/consent 와 같은 규칙).
  const { data: consents, error: cErr } = await admin
    .from("user_consents")
    .select("user_id, agreed, agreed_at")
    .in("user_id", userIds)
    .eq("type", "marketing")
    .order("agreed_at", { ascending: false })
    .returns<{ user_id: string; agreed: boolean }[]>();
  if (cErr) throw new Error(`consents: ${cErr.message}`);
  const agreed = new Map<string, boolean>();
  for (const c of consents ?? []) if (!agreed.has(c.user_id)) agreed.set(c.user_id, c.agreed);

  const { data: reviews, error: rErr } = await admin
    .from("reviews")
    .select("user_id, product_id")
    .in("user_id", userIds)
    .returns<{ user_id: string; product_id: string }[]>();
  if (rErr) throw new Error(`reviews: ${rErr.message}`);
  const reviewed = new Set((reviews ?? []).map((r) => `${r.user_id}:${r.product_id}`));

  for (const userId of userIds) {
    const mine = orders.filter((o) => o.user_id === userId);
    if (agreed.get(userId) !== true) {
      run.skipped += mine.length;
      continue;
    }

    // 먼저 표시해 이 실행이 맡는다. 다른 실행이 먼저 잡은 주문은 빠진다.
    const stamp = new Date(now).toISOString();
    const { data: claimed, error: claimErr } = await admin
      .from("orders")
      .update({ review_reminder_at: stamp })
      .in(
        "id",
        mine.map((o) => o.id),
      )
      .is("review_reminder_at", null)
      .select("id")
      .returns<{ id: string }[]>();
    if (claimErr) throw new Error(`claim: ${claimErr.message}`);
    const claimedIds = new Set((claimed ?? []).map((c) => c.id));
    if (claimedIds.size === 0) continue;

    // 판매 중 + 아직 리뷰 안 쓴 상품, 상품당 한 줄.
    const seen = new Set<string>();
    const items: (MailItem & { productId: string })[] = [];
    for (const o of mine) {
      if (!claimedIds.has(o.id)) continue;
      for (const it of activeLines(o.order_items)) {
        const pid = it.product_id;
        if (!pid || !it.products?.is_active || seen.has(pid)) continue;
        if (reviewed.has(`${userId}:${pid}`)) continue;
        seen.add(pid);
        items.push({
          productId: pid,
          name: it.product_name,
          quantity: it.quantity,
          image: firstImage(it.products.images),
          details: (it.options ?? []).map((op) => `${op.name}: ${op.value}`),
        });
      }
    }
    if (items.length === 0) {
      run.skipped += claimedIds.size;
      continue;
    }

    const to = await orderRecipientEmail(admin, { user_id: userId });
    const unsubscribeHref = unsubscribeUrl(userId);
    if (!to || !unsubscribeHref) {
      // 탈퇴 등으로 주소가 없으면 처리로 둔다. 서명 키가 없으면(설정 문제) 되돌려 둔다.
      if (!unsubscribeHref) await release(admin, claimedIds);
      run.skipped += claimedIds.size;
      continue;
    }

    const reviewHref =
      items.length === 1
        ? `${SITE_URL}/shop/${encodeURIComponent(items[0].productId)}#reviews`
        : `${SITE_URL}/mypage/orders`;
    const ok = await sendMail({
      to,
      ...reviewReminderMail({ items, reviewHref, unsubscribeHref }),
      headers: { "List-Unsubscribe": `<${unsubscribeHref}>` },
    });
    if (ok) run.sent += 1;
    else {
      await release(admin, claimedIds);
      run.failed += 1;
    }
  }
  return run;
}

async function release(admin: SupabaseClient, ids: Set<string>) {
  const { error } = await admin
    .from("orders")
    .update({ review_reminder_at: null })
    .in("id", [...ids]);
  if (error) console.error("[review-reminder] 표시 되돌리기 실패", error.message);
}

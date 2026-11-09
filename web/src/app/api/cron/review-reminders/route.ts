import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { sendReviewReminders } from "@/lib/emails/review-reminder";

// 리뷰 요청 메일(#919). Vercel Cron(vercel.json)이 매일 11시(KST) 호출. 대상·규칙은
// lib/emails/review-reminder 참고. CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer
// {CRON_SECRET} 자동 첨부). 결과는 개수만 돌려준다(주소·이름은 로그에도 남기지 않는다).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });

  try {
    const run = await sendReviewReminders(createAdminClient());
    return Response.json({ ok: true, ...run });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[review-reminders] 실패", message);
    return Response.json({ ok: false, error: message.slice(0, 200) }, { status: 500 });
  }
}

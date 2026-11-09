import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { sendReviewReminders } from "@/lib/emails/review-reminder";

// 리뷰 요청 메일(#919). Vercel Cron(vercel.json)이 매일 11시(KST) 호출. 대상·규칙은
// lib/emails/review-reminder 참고. CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer
// {CRON_SECRET} 자동 첨부). 결과는 개수만 돌려준다(주소·이름은 로그에도 남기지 않는다).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  // 대표님 확인 전까지 멈춤(시열님 2026-11-10). 환경변수 REVIEW_REMINDERS_ENABLED=1 일
  // 때만 보낸다. 없거나 다른 값이면 아무것도 읽거나 표시하지 않고 끝낸다(주문도 그대로라
  // 켜는 날 3~14일 안의 주문부터 정상으로 나간다).
  if (process.env.REVIEW_REMINDERS_ENABLED !== "1")
    return Response.json({ ok: true, paused: true });
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

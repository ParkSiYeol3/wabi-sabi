import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// 방치된 pending 주문 정리 — 24시간 넘게 미결제면 cancelled 처리.
// Vercel Cron(vercel.json)이 매일 호출. CRON_SECRET 으로 보호
// (Vercel 이 Authorization: Bearer {CRON_SECRET} 헤더를 자동 첨부).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("ordered_at", cutoff)
    .select("id");

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  // 비회원 주문조회 스로틀 로그(0044)도 함께 정리 — 1일 지난 시도 기록 삭제(무한 증가 방지).
  await admin
    .from("guest_lookup_throttle")
    .delete()
    .lt("attempted_at", cutoff);

  return Response.json({ ok: true, cancelled: data?.length ?? 0 });
}

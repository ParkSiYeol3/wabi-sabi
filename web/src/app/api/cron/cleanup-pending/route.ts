import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// 방치된 pending 주문 정리 — 1시간 넘게 미결제면 cancelled 처리.
// 토스 결제창은 결제 전 orderId 발급이 필요해 주문을 먼저 pending 으로 만든다.
// 결제하지 않고 이탈하면 pending 이 남는데, 고객 주문내역엔 이미 숨기지만(paid+
// 만 노출) DB·어드민 집계·미결제 5건 결제차단 가드를 위해 빨리 cancelled 로
// 정리한다. 결제창에서 실제 결제 중인 주문은 수 초~수 분 내 paid 로 확정되므로
// 1시간 컷오프에 걸리지 않는다. Vercel Cron(vercel.json)이 매시간 호출.
// CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer {CRON_SECRET} 자동 첨부).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("ordered_at", cutoff)
    .select("id");

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  // 비회원 주문조회 스로틀 로그(0044)도 함께 정리 — 스로틀 창은 10분이라 1시간
  // 지난 기록은 불필요하므로 같은 컷오프로 삭제(테이블 무한 증가 방지).
  await admin
    .from("guest_lookup_throttle")
    .delete()
    .lt("attempted_at", cutoff);

  return Response.json({ ok: true, cancelled: data?.length ?? 0 });
}

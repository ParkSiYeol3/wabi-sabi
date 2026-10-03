import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { epostConfigured, fetchEpostTrace } from "@/lib/epost-trace";
import { completeDelivery } from "@/lib/delivery";
import { logSystemAction } from "@/lib/audit";

// 우체국 배달완료 자동 확인(#791). Vercel Cron(vercel.json)이 09~22시(KST) 매시 17분 호출.
// 배송 중 + 우체국(courier epost 또는 0072 이전 null) + 송장 있는 주문을 조회해, 배달완료면
// 실제 배달 시각으로 배송완료 처리하고 손님에게 배송완료 메일을 보낸다(관리자 버튼과 같은 경로).
// 키가 없으면 아무것도 하지 않는다(대시보드의 발송 3일 알림이 대신, #779).
// CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer {CRON_SECRET} 자동 첨부).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });
  if (!epostConfigured()) return Response.json({ ok: true, skipped: "no epost key" });

  const { data: orders, error } = await createAdminClient()
    .from("orders")
    .select("id, tracking_number")
    .eq("status", "shipping")
    .not("tracking_number", "is", null)
    .or("courier.is.null,courier.eq.epost")
    .order("shipped_at", { ascending: true })
    .limit(50)
    .returns<{ id: string; tracking_number: string }[]>();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  let delivered = 0;
  const errors: string[] = [];
  // 한 번에 몇 건이라 순서대로(우체국 API 에 동시 요청을 몰지 않는다).
  for (const o of orders ?? []) {
    const trace = await fetchEpostTrace(o.tracking_number);
    if (trace.kind === "error") {
      errors.push(trace.message);
      continue;
    }
    if (trace.kind !== "delivered") continue;
    if (await completeDelivery(o.id, trace.deliveredAt)) {
      delivered++;
      await logSystemAction("epost-trace", {
        action: "order.mark_delivered",
        targetTable: "orders",
        targetId: o.id,
        meta: { status: "delivered", delivered_at: trace.deliveredAt, by: "auto" },
      });
    }
  }
  // 오류 문구엔 송장·키가 들어가지 않는다(returnCode·errMsg·HTTP 상태만).
  if (errors.length) console.error("[check-deliveries] 조회 실패", [...new Set(errors)]);
  return Response.json({ ok: true, checked: orders?.length ?? 0, delivered, errors: errors.length });
}

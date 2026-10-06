import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { epostConfigured, fetchEpostTrace } from "@/lib/epost-trace";
import { completeDelivery } from "@/lib/delivery";
import { logSystemAction } from "@/lib/audit";

// 우체국 배달완료 자동 확인(#791). Vercel Cron(vercel.json)이 09~22시(KST) 매시 17분 호출.
// 배송 중 + 우체국(courier epost 또는 0072 이전 null) + 송장 있는 주문을 조회해, 배달완료면
// 실제 배달 시각으로 배송완료 처리하고 손님에게 배송완료 메일을 보낸다(관리자 버튼과 같은 경로).
// 키가 없으면 아무것도 하지 않는다(대시보드의 발송 3일 알림이 대신, #779).
// CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer {CRON_SECRET} 자동 첨부).
// 매 실행 끝에 결과를 delivery_check_status(0077)에 남긴다(#794). 키가 없어 건너뛴 것과
// 배송 중이라 할 일이 없던 것을 로그 없이도 DB 로 구분하려고.

type Run = { checked?: number; delivered?: number; errors?: string[]; skipped?: string };

// 오류 문구는 바깥(우체국 응답·예외)에서 온다. 혹시 섞여 든 송장(긴 숫자)·키(긴 토큰)는 지운다.
const scrub = (s: string) =>
  s.replace(/\d{10,}/g, "[번호]").replace(/[A-Za-z0-9%+/=]{24,}/g, "[키]");

async function recordRun(run: Run) {
  const errors = [...new Set((run.errors ?? []).map(scrub))];
  const { error } = await createAdminClient()
    .from("delivery_check_status")
    .upsert({
      id: true,
      ran_at: new Date().toISOString(),
      checked: run.checked ?? 0,
      delivered: run.delivered ?? 0,
      error_count: run.errors?.length ?? 0,
      last_error: errors.length ? errors.join(" / ").slice(0, 300) : null,
      skipped: run.skipped ?? null,
    });
  if (error) console.error("[check-deliveries] 실행 기록 실패", error.message);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });
  if (!epostConfigured()) {
    console.warn("[check-deliveries] EPOST_SERVICE_KEY 없음: 건너뜀");
    await recordRun({ skipped: "no epost key" });
    return Response.json({ ok: true, skipped: "no epost key" });
  }

  const { data: orders, error } = await createAdminClient()
    .from("orders")
    .select("id, tracking_number")
    .eq("status", "shipping")
    .not("tracking_number", "is", null)
    .or("courier.is.null,courier.eq.epost")
    .order("shipped_at", { ascending: true })
    .limit(50)
    .returns<{ id: string; tracking_number: string }[]>();
  if (error) {
    console.error("[check-deliveries] 주문 조회 실패, 이번 실행 중단:", error.message);
    await recordRun({ errors: [`주문 조회 실패: ${error.message}`] });
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let delivered = 0;
  const errors: string[] = [];
  // 배송 중으로 읽은 주문의 마지막 처리현황(예 "배달준비"). 우체국이 실제로 주는 문구를
  // 로그로 보려고(#800). 처리현황엔 송장·이름이 없다.
  const pending: string[] = [];
  // 한 번에 몇 건이라 순서대로(우체국 API 에 동시 요청을 몰지 않는다).
  for (const o of orders ?? []) {
    const trace = await fetchEpostTrace(o.tracking_number);
    if (trace.kind === "error") {
      errors.push(trace.message);
      continue;
    }
    if (trace.kind !== "delivered") {
      pending.push(trace.last ?? "기록 없음");
      continue;
    }
    if (trace.approx)
      console.warn(`[check-deliveries] 배달 시각 형식 모름(${scrub(trace.approx)}): 확인 시각으로 처리`);
    if (await completeDelivery(o.id, trace.deliveredAt)) {
      delivered++;
      await logSystemAction("epost-trace", {
        action: "order.mark_delivered",
        targetTable: "orders",
        targetId: o.id,
        meta: { status: "delivered", delivered_at: trace.deliveredAt, by: "auto", approx: trace.approx ?? null },
      });
    }
  }
  // 오류 문구엔 송장·키가 들어가지 않는다(returnCode·errMsg·HTTP 상태만).
  if (errors.length) console.error("[check-deliveries] 조회 실패", [...new Set(errors.map(scrub))]);
  const checked = orders?.length ?? 0;
  console.log(
    `[check-deliveries] 조회 ${checked}건, 배송완료 ${delivered}건, 실패 ${errors.length}건` +
      (pending.length ? `, 배송 중 마지막 상태: ${[...new Set(pending.map(scrub))].join(" / ")}` : ""),
  );
  await recordRun({ checked, delivered, errors });
  return Response.json({ ok: true, checked, delivered, errors: errors.length });
}

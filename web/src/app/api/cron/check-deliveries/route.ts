import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { epostConfigured } from "@/lib/epost-trace";
import { sweetConfigured } from "@/lib/sweettracker-trace";
import { traceShipment, traceSource } from "@/lib/courier-trace";
import { completeDelivery } from "@/lib/delivery";
import { logSystemAction } from "@/lib/audit";
import { AUTO_DELIVER_DAYS, daysSinceShipped } from "@/lib/orders";

// 배달완료 자동 확인(#791, 다른 택배사 #818). Vercel Cron(vercel.json)이 09~22시(KST) 매시 17분 호출.
// 배송 중 + 송장 있는 주문을 택배사별로 조회해(lib/courier-trace: 우체국 공공 API / CJ·한진·
// 롯데·로젠 스마트택배 API), 배달완료면 실제 배달 시각으로 배송완료 처리하고 손님에게 배송완료
// 메일을 보낸다(관리자 버튼과 같은 경로). 스마트택배 무료 플랜은 같은 운송장 하루 10회 안내라
// 그쪽 주문은 짝수 시각에만 조회한다(10~22시 7회). 키가 없는 택배사는 조회하지 않는다(발송 3일 알림, #779).
// 조회로 확인할 수 없는 주문은 발송 AUTO_DELIVER_DAYS(10일) 경과면 배송완료로 바꾼다(#823).
// CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer {CRON_SECRET} 자동 첨부).
// 매 실행 끝에 결과를 delivery_check_status(0077)에 남긴다(#794). 키가 없어 조회를 못 한 것과
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

// 한 번 실행에 택배사 조회를 부르는 최대 건수(조회 API 에 몰지 않는다).
const TRACE_LIMIT = 50;

type ShippingOrder = {
  id: string;
  tracking_number: string | null;
  courier: string | null;
  shipped_at: string | null;
  ordered_at: string;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });
  // 조회 키가 없어도 10일 경과 처리는 한다. 키 없음은 실행 기록(skipped)으로 남긴다.
  const keyless = !epostConfigured() && !sweetConfigured();
  if (keyless)
    console.warn("[check-deliveries] 조회 키 없음(EPOST_SERVICE_KEY·SWEETTRACKER_API_KEY): 10일 경과만 처리");

  // 10일 경과 처리 때문에 택배사·송장과 상관없이 배송 중 주문 전체를 본다. 읽기는 넉넉히,
  // 택배사 조회 호출만 TRACE_LIMIT 으로 묶는다. 조회 대상이 계속 배송 중이어도 뒤에 있는
  // 10일 경과 주문이 밀리지 않게(조회 건수 제한과 읽는 범위를 분리).
  const { data: orders, error } = await createAdminClient()
    .from("orders")
    .select("id, tracking_number, courier, shipped_at, ordered_at")
    .eq("status", "shipping")
    .order("shipped_at", { ascending: true, nullsFirst: true })
    .limit(500)
    .returns<ShippingOrder[]>();
  if (error) {
    console.error("[check-deliveries] 주문 조회 실패, 이번 실행 중단:", error.message);
    await recordRun({ errors: [`주문 조회 실패: ${error.message}`] });
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let delivered = 0;
  let timed = 0;
  const errors: string[] = [];
  // 배송 중으로 읽은 주문의 마지막 처리현황(예 "배달준비"). 우체국이 실제로 주는 문구를
  // 로그로 보려고(#800). 처리현황엔 송장·이름이 없다.
  const pending: string[] = [];
  const nowMs = Date.now();
  // 스마트택배는 짝수 시각(KST)에만 부른다(같은 운송장 하루 조회 제한).
  const evenHour = (new Date(nowMs).getUTCHours() + 9) % 2 === 0;
  let checked = 0;
  // 한 번에 몇 건이라 순서대로(조회 API 에 동시 요청을 몰지 않는다).
  for (const o of orders ?? []) {
    const invoice = o.tracking_number;
    const source = invoice ? traceSource(o.courier) : null;
    if (source && invoice) {
      // 홀수 시각엔 조회도 10일 경과 처리도 하지 않고 다음 짝수 시각 조회를 기다린다.
      // 이번 실행의 조회 한도를 넘은 주문도 결과를 모르니 다음 실행으로 미룬다.
      if ((source === "sweettracker" && !evenHour) || checked >= TRACE_LIMIT) continue;
      checked++;
      const trace = await traceShipment(o.courier, invoice);
      if (trace.kind === "delivered") {
        if (trace.approx)
          console.warn(`[check-deliveries] 배달 시각 형식 모름(${scrub(trace.approx)}): 확인 시각으로 처리`);
        if (await completeDelivery(o.id, trace.deliveredAt)) {
          delivered++;
          await logSystemAction(source === "epost" ? "epost-trace" : "sweettracker", {
            action: "order.mark_delivered",
            targetTable: "orders",
            targetId: o.id,
            meta: { status: "delivered", delivered_at: trace.deliveredAt, by: "auto", approx: trace.approx ?? null },
          });
        }
        continue;
      }
      // 택배사가 아직 배송 중이라 답하면 10일이 지나도 두고 관리자가 본다(분실·반송일 수 있다).
      if (trace.kind === "in_transit") {
        pending.push(trace.last ?? "기록 없음");
        continue;
      }
      errors.push(trace.message);
    }

    // 조회로 확인할 수 없는 주문(기타 택배사·조회 키 없음·송장 없음·이번 조회 실패).
    // 실제 수령일을 몰라 처리 시각을 수령일로 둔다. 실제보다 늦어 청약철회 기간이 손님에게
    // 불리해지지 않는다.
    const days = daysSinceShipped(o, nowMs);
    if (days < AUTO_DELIVER_DAYS) continue;
    const at = new Date(nowMs).toISOString();
    if (await completeDelivery(o.id, at)) {
      delivered++;
      timed++;
      await logSystemAction("time-fallback", {
        action: "order.mark_delivered",
        targetTable: "orders",
        targetId: o.id,
        meta: {
          status: "delivered",
          delivered_at: at,
          by: `auto-${AUTO_DELIVER_DAYS}d`,
          days,
          reason: source ? "trace-error" : "untracked",
        },
      });
    }
  }
  // 오류 문구엔 송장·키가 들어가지 않는다(코드·메시지·HTTP 상태만).
  if (errors.length) console.error("[check-deliveries] 조회 실패", [...new Set(errors.map(scrub))]);
  console.log(
    `[check-deliveries] 조회 ${checked}건, 배송완료 ${delivered}건(${AUTO_DELIVER_DAYS}일 경과 ${timed}건), 실패 ${errors.length}건` +
      (pending.length ? `, 배송 중 마지막 상태: ${[...new Set(pending.map(scrub))].join(" / ")}` : ""),
  );
  await recordRun({ checked, delivered, errors, skipped: keyless ? "no tracking keys" : undefined });
  return Response.json({ ok: true, checked, delivered, timed, errors: errors.length });
}

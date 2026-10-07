import { isAdmin } from "@/lib/admin";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { traceShipment, traceSource } from "@/lib/courier-trace";
import { isCourierCode } from "@/lib/orders";

// 배송조회 점검(#807, 다른 택배사 #818). 관리자만 연다.
//   /api/admin/epost-trace?id={주문 id}                 주문 하나
//   /api/admin/epost-trace?courier=cj&invoice={송장번호}  주문 없이 아무 송장(새 택배사 연결 확인용)
// 크론과 같은 traceShipment 로 조회해 해석 결과만 돌려준다. 주문 상태는 바꾸지 않는다.
// 크론은 배송 중 주문만 보므로, 이미 배달된 송장으로 실제 응답을 확인할 길이 없었다(10/6 첫
// 실주문, 날짜 형식을 못 읽은 것을 배포 뒤에야 알았다 #803). 경로 이름은 처음 만든 그대로 둔다.
// 응답에 송장번호·이름·주소는 넣지 않는다.

const KST = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

export async function GET(req: Request) {
  // 관리자가 아니면 있는지도 알리지 않는다.
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 404 });
  const params = new URL(req.url).searchParams;

  let courier: string | null = null;
  let invoice: string | null = null;
  let order: { status: string; courier: string } | undefined;

  const id = params.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      return Response.json({ ok: false, error: "주문 id 형식이 아닙니다" }, { status: 400 });
    if (!adminConfigured())
      return Response.json({ ok: false, error: "서버 키 없음" }, { status: 503 });
    const { data } = await createAdminClient()
      .from("orders")
      .select("status, courier, tracking_number")
      .eq("id", id)
      .maybeSingle<{ status: string; courier: string | null; tracking_number: string | null }>();
    if (!data?.tracking_number)
      return Response.json({ ok: false, error: "송장이 없는 주문" }, { status: 404 });
    courier = data.courier;
    invoice = data.tracking_number;
    order = { status: data.status, courier: data.courier ?? "epost(0072 이전)" };
  } else {
    courier = params.get("courier");
    invoice = params.get("invoice");
    if (!isCourierCode(courier) || !invoice?.replace(/\D/g, ""))
      return Response.json(
        { ok: false, error: "id 또는 courier(epost·cj·hanjin·lotte·logen)+invoice 가 필요합니다" },
        { status: 400 },
      );
  }

  const source = traceSource(courier);
  if (!source)
    return Response.json(
      { ok: false, error: "자동 조회를 지원하지 않는 택배사이거나 조회 키가 없습니다" },
      { status: 503 },
    );

  const trace = await traceShipment(courier, invoice);
  return Response.json(
    {
      ok: true,
      source,
      ...(order ? { order } : { courier }),
      trace:
        trace.kind === "delivered" ? { ...trace, deliveredAtKst: KST(trace.deliveredAt) } : trace,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

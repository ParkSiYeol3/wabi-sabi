import { isAdmin } from "@/lib/admin";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { epostConfigured, fetchEpostTrace } from "@/lib/epost-trace";

// 우체국 배송조회 점검(#807). 관리자만 연다: /api/admin/epost-trace?id={주문 id}
// 주문 하나를 크론과 같은 경로(fetchEpostTrace)로 조회해 해석 결과만 돌려준다. 주문 상태는
// 바꾸지 않는다. 크론은 배송 중 주문만 보므로, 이미 배달된 주문으로 실제 응답을 확인할 길이
// 없었다(10/6 첫 실주문, 날짜 형식을 못 읽은 것을 배포 뒤에야 알았다 #803).
// 응답에 송장번호·이름·주소는 넣지 않는다.

const KST = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

export async function GET(req: Request) {
  // 관리자가 아니면 있는지도 알리지 않는다.
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 404 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return Response.json({ ok: false, error: "주문 id 가 필요합니다" }, { status: 400 });
  if (!adminConfigured() || !epostConfigured())
    return Response.json({ ok: false, error: "서버 키 또는 우체국 키 없음" }, { status: 503 });

  const { data: order } = await createAdminClient()
    .from("orders")
    .select("status, courier, tracking_number")
    .eq("id", id)
    .maybeSingle<{ status: string; courier: string | null; tracking_number: string | null }>();
  if (!order?.tracking_number)
    return Response.json({ ok: false, error: "송장이 없는 주문" }, { status: 404 });

  const trace = await fetchEpostTrace(order.tracking_number);
  return Response.json(
    {
      ok: true,
      order: { status: order.status, courier: order.courier ?? "epost(0072 이전)" },
      trace:
        trace.kind === "delivered" ? { ...trace, deliveredAtKst: KST(trace.deliveredAt) } : trace,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

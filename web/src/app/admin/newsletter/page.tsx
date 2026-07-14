import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "뉴스레터 구독자" };

// 구독자 목록 (#116) — 0017 에서 수집만 만들어 대표님이 발송 대상을 볼 수 없었다.
// service_role 전용 테이블이라 이 서버 컴포넌트에서만 조회한다(공개 노출 금지).
type SubscriberRow = {
  id: string;
  email: string;
  consented_at: string;
  unsubscribed_at: string | null;
  created_at: string;
};

export default async function AdminNewsletterPage() {
  await requireAdmin();
  if (!adminConfigured())
    return (
      <p className="text-sm text-wabi-fg-muted">
        <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 구독자를 조회할 수 없습니다.
      </p>
    );

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("newsletter_subscribers")
    .select("id, email, consented_at, unsubscribed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<SubscriberRow[]>();

  const list = rows ?? [];
  const active = list.filter((r) => !r.unsubscribed_at).length;

  return (
    <div>
      <h2 className="text-lg font-medium">뉴스레터 구독자</h2>
      <p className="mt-1 text-sm text-wabi-fg-muted">
        수신 동의 {active}명 · 수신거부 {list.length - active}명 (최근 500건)
      </p>

      {list.length === 0 ? (
        <p className="mt-10 text-center text-sm text-wabi-fg-muted">
          구독자가 없습니다.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-wabi-border text-left text-xs text-wabi-fg-muted">
                <th className="py-2 pr-4 font-medium">이메일</th>
                <th className="py-2 pr-4 font-medium">상태</th>
                <th className="py-2 pr-4 font-medium">동의 시각</th>
                <th className="py-2 font-medium">수신거부 시각</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-wabi-border/60">
                  <td className="py-2 pr-4 whitespace-nowrap">{r.email}</td>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs">
                    {r.unsubscribed_at ? (
                      <span className="text-wabi-fg-muted">수신거부</span>
                    ) : (
                      <span>수신 동의</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs text-wabi-fg-muted">
                    {new Date(r.consented_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="py-2 whitespace-nowrap text-xs text-wabi-fg-muted">
                    {r.unsubscribed_at
                      ? new Date(r.unsubscribed_at).toLocaleString("ko-KR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-wabi-fg-muted">
        발송 시 각 메일에 수신거부 링크(<code>/newsletter/unsubscribe?token=…</code>)를
        반드시 포함해야 합니다 — 정보통신망법 §50. 토큰은 구독자별로 다르며 이
        화면에는 노출하지 않습니다(발송 스크립트가 DB 에서 읽어 씁니다).
      </p>
    </div>
  );
}

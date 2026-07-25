import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, TablePanel, EmptyState } from "@/components/admin/ui";

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
      <>
        <PageHeader title="뉴스레터 구독자" />
        <EmptyState>
          <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 구독자를 조회할 수
          없습니다.
        </EmptyState>
      </>
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
    <>
      <PageHeader
        title="뉴스레터 구독자"
        description={`수신 동의 ${active}명 · 수신거부 ${list.length - active}명 (최근 500건)`}
      />

      {list.length === 0 ? (
        <EmptyState>구독자가 없습니다.</EmptyState>
      ) : (
        <TablePanel>
          <table className="w-full text-sm">
            <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">동의 시각</th>
                <th className="px-4 py-3 font-medium">수신거부 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {list.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-wabi-muted/40">
                  <td className="px-4 py-3 whitespace-nowrap">{r.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {r.unsubscribed_at ? (
                      <span className="inline-block rounded-full border border-wabi-border px-2 py-0.5 text-wabi-fg-muted">
                        수신거부
                      </span>
                    ) : (
                      <span className="inline-block rounded-full border border-wabi-fg/60 px-2 py-0.5 text-wabi-fg">
                        수신 동의
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-wabi-fg-muted">
                    {new Date(r.consented_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-wabi-fg-muted">
                    {r.unsubscribed_at
                      ? new Date(r.unsubscribed_at).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      <p className="mt-8 text-xs text-wabi-fg-muted">
        발송 시 각 메일에 수신거부 링크(<code>/newsletter/unsubscribe?token=…</code>)를
        반드시 포함해야 합니다 — 정보통신망법 §50. 토큰은 구독자별로 다르며 이
        화면에는 노출하지 않습니다(발송 스크립트가 DB 에서 읽어 씁니다).
      </p>
    </>
  );
}

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, TablePanel, EmptyState } from "@/components/admin/ui";

export const metadata: Metadata = { title: "감사로그" };

// 어드민 액션 감사로그 조회 (0013). service_role 로 최근 200건.
type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export default async function AdminAuditPage() {
  await requireAdmin();
  if (!adminConfigured())
    return (
      <>
        <PageHeader title="감사로그" />
        <EmptyState>
          <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 감사로그를 조회할 수
          없습니다.
        </EmptyState>
      </>
    );

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("admin_audit_log")
    .select("id, actor_email, action, target_table, target_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AuditRow[]>();

  return (
    <>
      <PageHeader title="감사로그" description="어드민 액션 최근 200건 (최신순)." />

      {!rows || rows.length === 0 ? (
        <EmptyState>기록이 없습니다.</EmptyState>
      ) : (
        <TablePanel>
          <table className="w-full text-sm">
            <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">수행자</th>
                <th className="px-4 py-3 font-medium">액션</th>
                <th className="px-4 py-3 font-medium">대상</th>
                <th className="px-4 py-3 font-medium">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="align-top transition-colors hover:bg-wabi-muted/40"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-wabi-fg-muted">
                    {/* KST 고정 — 서버가 UTC 라 로컬 변환 없이 두면 시각이 어긋난다 */}
                    {new Date(r.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.actor_email ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    {r.action}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-wabi-fg-muted">
                    {r.target_table}
                    {r.target_id ? `#${r.target_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-wabi-fg-muted">
                    {r.meta ? JSON.stringify(r.meta) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}
    </>
  );
}

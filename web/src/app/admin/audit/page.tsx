import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

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
      <p className="text-sm text-wabi-fg-muted">
        <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 감사로그를 조회할 수 없습니다.
      </p>
    );

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("admin_audit_log")
    .select("id, actor_email, action, target_table, target_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AuditRow[]>();

  return (
    <div>
      <h2 className="text-lg font-medium">감사로그</h2>
      <p className="mt-1 text-sm text-wabi-fg-muted">
        어드민 액션 최근 200건 (최신순).
      </p>

      {!rows || rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-wabi-fg-muted">
          기록이 없습니다.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-wabi-border text-left text-xs text-wabi-fg-muted">
                <th className="py-2 pr-4 font-medium">시각</th>
                <th className="py-2 pr-4 font-medium">수행자</th>
                <th className="py-2 pr-4 font-medium">액션</th>
                <th className="py-2 pr-4 font-medium">대상</th>
                <th className="py-2 font-medium">상세</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-wabi-border/60 align-top">
                  <td className="py-2 pr-4 whitespace-nowrap text-wabi-fg-muted">
                    {new Date(r.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {r.actor_email ?? "—"}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs">
                    {r.action}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs text-wabi-fg-muted">
                    {r.target_table}
                    {r.target_id ? `#${r.target_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="py-2 text-xs text-wabi-fg-muted">
                    {r.meta ? JSON.stringify(r.meta) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

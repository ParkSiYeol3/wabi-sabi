import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, TablePanel, EmptyState } from "@/components/admin/ui";

export const metadata: Metadata = { title: "에러 로그" };

// 클라이언트 에러 로그 조회 (0014). service_role 로 최근 200건.
type ErrorRow = {
  id: string;
  digest: string | null;
  message: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
};

export default async function AdminErrorsPage() {
  await requireAdmin();
  if (!adminConfigured())
    return (
      <>
        <PageHeader title="에러 로그" />
        <EmptyState>
          <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 에러 로그를 조회할 수
          없습니다.
        </EmptyState>
      </>
    );

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("client_error_log")
    .select("id, digest, message, url, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ErrorRow[]>();

  return (
    <>
      <PageHeader
        title="에러 로그"
        description="클라이언트 에러 최근 200건 (최신순). digest 로 Vercel 서버 로그와 상관."
      />

      {!rows || rows.length === 0 ? (
        <EmptyState>기록이 없습니다.</EmptyState>
      ) : (
        <TablePanel>
          <table className="w-full text-sm">
            <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">경로</th>
                <th className="px-4 py-3 font-medium">메시지</th>
                <th className="px-4 py-3 font-medium">digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="align-top transition-colors hover:bg-wabi-muted/40"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-wabi-fg-muted">
                    {new Date(r.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {r.url ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.message ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-wabi-fg-muted">
                    {r.digest ?? "—"}
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

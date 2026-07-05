import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

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
      <p className="text-sm text-wabi-fg-muted">
        <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 에러 로그를 조회할 수 없습니다.
      </p>
    );

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("client_error_log")
    .select("id, digest, message, url, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ErrorRow[]>();

  return (
    <div>
      <h2 className="text-lg font-medium">에러 로그</h2>
      <p className="mt-1 text-sm text-wabi-fg-muted">
        클라이언트 에러 최근 200건 (최신순). digest 로 Vercel 서버 로그와 상관.
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
                <th className="py-2 pr-4 font-medium">경로</th>
                <th className="py-2 pr-4 font-medium">메시지</th>
                <th className="py-2 font-medium">digest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-wabi-border/60 align-top">
                  <td className="py-2 pr-4 whitespace-nowrap text-wabi-fg-muted">
                    {new Date(r.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs">
                    {r.url ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-xs">{r.message ?? "—"}</td>
                  <td className="py-2 whitespace-nowrap font-mono text-xs text-wabi-fg-muted">
                    {r.digest ?? "—"}
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

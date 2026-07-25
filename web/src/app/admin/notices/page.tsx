import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  PageHeader,
  SectionHeading,
  TablePanel,
  EmptyState,
} from "@/components/admin/ui";
import { createNotice, deleteNotice } from "./actions";

type Notice = { id: string; title: string; created_at: string };

export default async function AdminNoticesPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: notices } = await db
    .from("notices")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .returns<Notice[]>();

  return (
    <>
      <PageHeader title="공지" description="공지사항 등록·삭제." />

      <div className="space-y-10">
        {/* 새 공지 */}
        <section>
          <SectionHeading>새 공지 등록</SectionHeading>
          <form action={createNotice} className="mt-3 space-y-3">
            <Input
              name="title"
              required
              aria-label="공지 제목"
              placeholder="제목"
              className="rounded-lg"
            />
            <textarea
              name="body"
              required
              rows={6}
              aria-label="공지 내용"
              placeholder="내용"
              className="w-full rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 py-2 text-sm outline-none transition-colors focus:border-wabi-fg"
            />
            <SubmitButton
              styled
              pendingText="등록 중…"
              className="rounded-lg bg-wabi-accent hover:bg-wabi-accent/90"
            >
              등록
            </SubmitButton>
          </form>
        </section>

        {/* 목록 */}
        <section>
          <SectionHeading>공지 목록 ({notices?.length ?? 0})</SectionHeading>
          {!notices?.length ? (
            <div className="mt-3">
              <EmptyState>등록된 공지가 없습니다.</EmptyState>
            </div>
          ) : (
            <div className="mt-3">
              <TablePanel>
                <table className="w-full min-w-150 text-sm">
                  <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">제목</th>
                      <th className="px-4 py-3 font-medium">작성일</th>
                      <th className="px-4 py-3 font-medium">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wabi-border">
                    {notices.map((n) => (
                      <tr
                        key={n.id}
                        className="transition-colors hover:bg-wabi-muted/40"
                      >
                        <td className="px-4 py-3">{n.title}</td>
                        <td className="px-4 py-3 text-wabi-fg-muted">
                          {new Date(n.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-3">
                          <form action={deleteNotice}>
                            <input type="hidden" name="id" value={n.id} />
                            <SubmitButton
                              pendingText="삭제 중…"
                              className="cursor-pointer text-xs text-red-700 underline-offset-2 transition-colors hover:text-red-800 hover:underline"
                            >
                              삭제
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
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
    <div className="space-y-10">
      {/* 새 공지 */}
      <section>
        <h2 className="text-lg font-medium">새 공지 등록</h2>
        <form action={createNotice} className="mt-4 space-y-3">
          <Input
            name="title"
            required
            aria-label="공지 제목"
            placeholder="제목"
            className="rounded-none"
          />
          <textarea
            name="body"
            required
            rows={6}
            aria-label="공지 내용"
            placeholder="내용"
            className="w-full border border-wabi-border bg-transparent px-3 py-2 text-sm"
          />
          <Button
            type="submit"
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
          >
            등록
          </Button>
        </form>
      </section>

      {/* 목록 */}
      <section>
        <h2 className="text-lg font-medium">
          공지 목록 ({notices?.length ?? 0})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-150 text-sm">
            <thead className="border-b border-wabi-border text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="py-2">제목</th>
                <th className="py-2">작성일</th>
                <th className="py-2">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {notices?.map((n) => (
                <tr key={n.id}>
                  <td className="py-3">{n.title}</td>
                  <td className="py-3 text-wabi-fg-muted">
                    {new Date(n.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="py-3">
                    <form action={deleteNotice}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="cursor-pointer text-xs text-red-600 underline transition-colors hover:text-red-700"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

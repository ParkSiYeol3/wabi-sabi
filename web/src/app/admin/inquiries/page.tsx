import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { answerInquiry, deleteInquiry } from "./actions";

type Inquiry = {
  id: string;
  title: string;
  body: string;
  is_secret: boolean;
  answer: string | null;
  created_at: string;
};

export default async function AdminInquiriesPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: inquiries } = await db
    .from("inquiries")
    .select("id, title, body, is_secret, answer, created_at")
    .order("created_at", { ascending: false })
    .returns<Inquiry[]>();

  return (
    <>
      <PageHeader
        title="문의"
        description={`고객 문의 ${inquiries?.length ?? 0}건 (최신순).`}
      />

      {!inquiries?.length ? (
        <EmptyState>등록된 문의가 없습니다.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <li
              key={q.id}
              className="rounded-xl border border-wabi-border bg-wabi-bg/40 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {q.is_secret && "🔒 "}
                    {q.title}
                    <span
                      className={`ml-2 inline-block rounded-full border px-2 py-0.5 text-xs ${
                        q.answer
                          ? "border-wabi-fg/50 text-wabi-fg"
                          : "border-amber-300 text-amber-800"
                      }`}
                    >
                      {q.answer ? "답변완료" : "답변대기"}
                    </span>
                  </p>
                  <time className="text-xs text-wabi-fg-muted">
                    {new Date(q.created_at).toLocaleDateString("ko-KR")}
                  </time>
                </div>
                <form action={deleteInquiry}>
                  <input type="hidden" name="id" value={q.id} />
                  <button
                    type="submit"
                    className="cursor-pointer text-xs text-red-700 underline-offset-2 transition-colors hover:text-red-800 hover:underline"
                  >
                    삭제
                  </button>
                </form>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-wabi-fg-muted">
                {q.body}
              </p>

              <form action={answerInquiry} className="mt-4 space-y-2">
                <input type="hidden" name="id" value={q.id} />
                <textarea
                  name="answer"
                  rows={3}
                  required
                  defaultValue={q.answer ?? ""}
                  aria-label={`${q.title} 답변 작성`}
                  placeholder="답변 작성"
                  className="w-full rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 py-2 text-sm outline-none transition-colors focus:border-wabi-fg"
                />
                <Button
                  type="submit"
                  className="rounded-lg bg-wabi-accent hover:bg-wabi-accent/90"
                >
                  {q.answer ? "답변 수정" : "답변 등록"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

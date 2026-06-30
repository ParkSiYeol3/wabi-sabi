import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
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
    <div className="space-y-8">
      <h2 className="text-lg font-medium">
        문의 목록 ({inquiries?.length ?? 0})
      </h2>

      {!inquiries?.length && (
        <p className="text-sm text-wabi-fg-muted">등록된 문의가 없습니다.</p>
      )}

      <ul className="space-y-6">
        {inquiries?.map((q) => (
          <li key={q.id} className="border border-wabi-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {q.is_secret && "🔒 "}
                  {q.title}
                  <span
                    className={`ml-2 text-xs ${q.answer ? "text-wabi-accent" : "text-wabi-fg-muted"}`}
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
                <button type="submit" className="text-xs text-red-600 underline">
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
                placeholder="답변 작성"
                className="w-full border border-wabi-border bg-transparent px-3 py-2 text-sm"
              />
              <Button
                type="submit"
                className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
              >
                {q.answer ? "답변 수정" : "답변 등록"}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

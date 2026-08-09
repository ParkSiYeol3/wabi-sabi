import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, EmptyState, adminAction } from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import { AnswerForm } from "@/components/admin/answer-form";
import { deleteInquiry } from "./actions";

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
                  <SubmitButton
                    pendingText="삭제 중…"
                    className={adminAction({ tone: "danger" })}
                  >
                    삭제
                  </SubmitButton>
                </form>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-wabi-fg-muted">
                {q.body}
              </p>

              <AnswerForm
                inquiryId={q.id}
                existingAnswer={q.answer}
                title={q.title}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

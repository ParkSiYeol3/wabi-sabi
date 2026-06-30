import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Container } from "@/components/container";
import { getInquiry } from "@/lib/queries/inquiries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const q = await getInquiry(id);
  if (!q) return { title: "문의를 찾을 수 없음" };
  return { title: q.title };
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // RLS: 타인 비밀글이면 null → notFound
  const q = await getInquiry(id);
  if (!q) notFound();

  return (
    <Container className="py-16">
      <article className="mx-auto max-w-2xl">
        <header className="border-b border-wabi-border pb-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {q.is_secret && (
              <Lock className="size-4 text-wabi-fg-muted" aria-label="비밀글" />
            )}
            {q.title}
          </h1>
          <time className="mt-2 block text-xs text-wabi-fg-muted">
            {new Date(q.created_at).toLocaleDateString("ko-KR")}
          </time>
        </header>

        <div className="mt-8 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
          {q.body}
        </div>

        {/* 관리자 답변 */}
        {q.answer ? (
          <div className="mt-10 border-l-2 border-wabi-accent bg-wabi-subtle p-5">
            <p className="text-xs font-medium text-wabi-accent">관리자 답변</p>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
              {q.answer}
            </div>
            {q.answered_at && (
              <time className="mt-3 block text-xs text-wabi-fg-muted">
                {new Date(q.answered_at).toLocaleDateString("ko-KR")}
              </time>
            )}
          </div>
        ) : (
          <p className="mt-10 text-sm text-wabi-fg-muted">아직 답변이 등록되지 않았습니다.</p>
        )}

        <div className="mt-12 border-t border-wabi-border pt-6">
          <Link href="/inquiry" className="text-sm hover:underline">
            ← 목록으로
          </Link>
        </div>
      </article>
    </Container>
  );
}

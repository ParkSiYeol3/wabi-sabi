import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getNotice } from "@/lib/queries/notices";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const notice = await getNotice(id);
  if (!notice) return { title: "공지를 찾을 수 없음" };
  return { title: notice.title, description: `WABI-SABI 공지 — ${notice.title}` };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = await getNotice(id);
  if (!notice) notFound();

  return (
    <Container className="py-16">
      <article className="mx-auto max-w-2xl">
        <header className="border-b border-wabi-border pb-6">
          <h1 className="text-xl font-semibold">{notice.title}</h1>
          <time className="mt-2 block text-xs text-wabi-fg-muted">
            {new Date(notice.created_at).toLocaleDateString("ko-KR")}
          </time>
        </header>
        <div className="mt-8 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
          {notice.body}
        </div>
        <div className="mt-12 border-t border-wabi-border pt-6">
          <Link href="/notice" className="text-sm hover:underline">
            ← 목록으로
          </Link>
        </div>
      </article>
    </Container>
  );
}

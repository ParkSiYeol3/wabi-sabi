import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { getNotices } from "@/lib/queries/notices";

export const metadata: Metadata = {
  title: "공지사항",
  description: "WABI-SABI 공지사항",
};

export default async function NoticeListPage() {
  const notices = await getNotices();

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">공지사항</h1>

      {notices.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          등록된 공지가 없습니다.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
          {notices.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notice/${n.id}`}
                className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-wabi-accent"
              >
                <span className="text-sm">{n.title}</span>
                <time className="shrink-0 text-xs text-wabi-fg-muted">
                  {new Date(n.created_at).toLocaleDateString("ko-KR")}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

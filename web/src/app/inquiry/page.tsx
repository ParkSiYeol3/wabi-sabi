import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { getInquiries } from "@/lib/queries/inquiries";

export const metadata: Metadata = {
  title: "문의",
  description: "WABI-SABI 1:1 문의",
};

export default async function InquiryListPage() {
  const inquiries = await getInquiries();

  return (
    <Container className="py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-wide">문의</h1>
        <Button
          asChild
          className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          <Link href="/inquiry/new">문의하기</Link>
        </Button>
      </div>

      {inquiries.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          등록된 문의가 없습니다.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
          {inquiries.map((q) => (
            <li key={q.id}>
              <Link
                href={`/inquiry/${q.id}`}
                className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-wabi-accent"
              >
                <span className="flex items-center gap-2 text-sm">
                  {q.is_secret && (
                    <Lock className="size-3.5 text-wabi-fg-muted" aria-label="비밀글" />
                  )}
                  {q.title}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs">
                  <span
                    className={
                      q.answered ? "text-wabi-accent" : "text-wabi-fg-muted"
                    }
                  >
                    {q.answered ? "답변완료" : "답변대기"}
                  </span>
                  <time className="text-wabi-fg-muted">
                    {new Date(q.created_at).toLocaleDateString("ko-KR")}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

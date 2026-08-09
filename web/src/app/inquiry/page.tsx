import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getInquiries } from "@/lib/queries/inquiries";

export const metadata: Metadata = {
  title: "문의",
  description: "와비사비 1:1 문의입니다. 편하게 남겨주세요.",
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
        <ul className="mt-10 space-y-2">
          {inquiries.map((q) => (
            <li key={q.id}>
              {/* 행 자체를 누를 수 있는 카드 버튼처럼 — hover 강조 + 누르면 살짝
                  눌리는 press 피드백(대표님). */}
              <Link
                href={`/inquiry/${q.id}`}
                className="flex items-center justify-between gap-4 rounded-md border border-wabi-border px-4 py-4 transition hover:border-wabi-fg hover:bg-wabi-subtle/50 active:scale-[0.99] active:bg-wabi-muted"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  {q.is_secret && (
                    <Lock
                      className="size-3.5 shrink-0 text-wabi-fg-muted"
                      aria-label="비밀글"
                    />
                  )}
                  <span className="truncate">{q.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {/* 상태 배지 — 답변완료=초록, 답변대기=회색 pill 로 직관성↑ */}
                  <span
                    className={
                      q.answered
                        ? "rounded-full border border-green-600/40 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                        : "rounded-full border border-wabi-border bg-wabi-muted px-2.5 py-1 text-xs font-medium text-wabi-fg-muted"
                    }
                  >
                    {q.answered ? "답변완료" : "답변대기"}
                  </span>
                  {/* 날짜 — 또렷하게(대표님: 너무 안 보임) */}
                  <time className="font-numeric text-xs text-wabi-fg">
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

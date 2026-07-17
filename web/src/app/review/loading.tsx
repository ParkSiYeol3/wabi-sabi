import { Container } from "@/components/container";

// 리뷰 목록 스켈레톤 (#172) — 별점·작성자 줄 + 본문 형태.
export default function ReviewLoading() {
  return (
    <Container className="py-16">
      <div className="h-8 w-20 animate-pulse bg-wabi-muted" />
      <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-40 animate-pulse bg-wabi-muted" />
              <div className="h-3 w-20 animate-pulse bg-wabi-muted" />
            </div>
            <div className="mt-3 h-3 w-full animate-pulse bg-wabi-muted" />
            <div className="mt-2 h-3 w-4/5 animate-pulse bg-wabi-muted" />
          </li>
        ))}
      </ul>
    </Container>
  );
}

import { Container } from "@/components/container";

// 문의 목록 스켈레톤 (#172) — 제목 줄 + 문의하기 버튼 자리.
export default function InquiryLoading() {
  return (
    <Container className="py-16">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-20 animate-pulse bg-wabi-muted" />
        <div className="h-9 w-24 animate-pulse bg-wabi-muted" />
      </div>
      <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-5">
            <div className="h-4 w-1/2 animate-pulse bg-wabi-muted" />
            <div className="h-3 w-20 shrink-0 animate-pulse bg-wabi-muted" />
          </li>
        ))}
      </ul>
    </Container>
  );
}

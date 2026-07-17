import { Container } from "@/components/container";

// 주문 내역 스켈레톤 (#172) — 카드(썸네일 + 텍스트) 형태에 맞춘다.
export default function OrdersLoading() {
  return (
    <Container className="py-16">
      <div className="h-8 w-32 animate-pulse bg-wabi-muted" />
      <ul className="mt-10 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="border border-wabi-border p-5">
            <div className="flex items-start gap-4">
              <div className="size-20 shrink-0 animate-pulse bg-wabi-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-32 animate-pulse bg-wabi-muted" />
                  <div className="h-5 w-16 animate-pulse bg-wabi-muted" />
                </div>
                <div className="mt-2 h-3 w-24 animate-pulse bg-wabi-muted" />
                <div className="mt-4 h-4 w-2/3 animate-pulse bg-wabi-muted" />
                <div className="mt-2 h-4 w-20 animate-pulse bg-wabi-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}

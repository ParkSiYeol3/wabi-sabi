import { Container } from "@/components/container";

// 위시리스트 스켈레톤 (#172) — 상품 그리드 + 담기 버튼 형태.
export default function WishlistLoading() {
  return (
    <Container className="py-16">
      <div className="h-8 w-28 animate-pulse bg-wabi-muted" />
      <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="aspect-square animate-pulse bg-wabi-muted" />
            <div className="mt-3 h-3 w-2/3 animate-pulse bg-wabi-muted" />
            <div className="mt-2 h-3 w-1/3 animate-pulse bg-wabi-muted" />
            <div className="mt-3 h-9 w-full animate-pulse bg-wabi-muted" />
          </li>
        ))}
      </ul>
    </Container>
  );
}

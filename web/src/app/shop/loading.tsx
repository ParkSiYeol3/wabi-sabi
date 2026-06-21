import { Container } from "@/components/container";

export default function ShopLoading() {
  return (
    <Container className="py-16">
      <div className="h-8 w-24 animate-pulse bg-wabi-muted" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse bg-wabi-muted" />
        ))}
      </div>
      <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}>
            <div className="aspect-square animate-pulse bg-wabi-muted" />
            <div className="mt-3 h-3 w-2/3 animate-pulse bg-wabi-muted" />
            <div className="mt-2 h-3 w-1/3 animate-pulse bg-wabi-muted" />
          </li>
        ))}
      </ul>
    </Container>
  );
}

import { Container } from "@/components/container";

export default function ProductLoading() {
  return (
    <Container className="py-16">
      <div className="grid gap-12 md:grid-cols-2">
        <div className="aspect-square animate-pulse bg-wabi-muted" />
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse bg-wabi-muted" />
          <div className="h-7 w-2/3 animate-pulse bg-wabi-muted" />
          <div className="h-5 w-1/3 animate-pulse bg-wabi-muted" />
          <div className="h-24 w-full animate-pulse bg-wabi-muted" />
          <div className="h-12 w-full animate-pulse bg-wabi-muted" />
        </div>
      </div>
    </Container>
  );
}

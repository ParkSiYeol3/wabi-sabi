import { Container } from "@/components/container";

export default function MyPageLoading() {
  return (
    <Container className="py-16">
      <div className="h-8 w-32 animate-pulse bg-wabi-muted" />
      <div className="mt-12 space-y-3">
        <div className="h-4 w-48 animate-pulse bg-wabi-muted" />
        <div className="h-10 w-80 animate-pulse bg-wabi-muted" />
      </div>
    </Container>
  );
}

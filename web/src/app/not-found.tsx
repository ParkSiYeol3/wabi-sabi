import Link from "next/link";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-32 text-center">
      <span className="font-serif-jp text-5xl text-wabi-fg-muted">侘</span>
      <h1 className="mt-8 text-2xl font-semibold">404</h1>
      <p className="mt-3 text-sm text-wabi-fg-muted">
        찾으시는 페이지가 없습니다.
      </p>
      <Button
        asChild
        className="mt-10 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90"
      >
        <Link href="/">홈으로</Link>
      </Button>
    </Container>
  );
}

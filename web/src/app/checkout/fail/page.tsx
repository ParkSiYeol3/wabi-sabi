import Link from "next/link";
import { XCircle } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

type SP = { code?: string; message?: string };

export default async function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { message } = await searchParams;

  return (
    <Container className="flex flex-col items-center py-28 text-center">
      <XCircle className="size-12 text-red-600" strokeWidth={1.2} />
      <h1 className="mt-6 text-2xl font-semibold">결제가 취소되었습니다</h1>
      <p className="mt-3 text-sm text-wabi-fg-muted">
        {message || "결제가 진행되지 않았습니다. 다시 시도해 주세요."}
      </p>
      <Button
        asChild
        className="mt-10 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90"
      >
        <Link href="/cart">장바구니로</Link>
      </Button>
    </Container>
  );
}

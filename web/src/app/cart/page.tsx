import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "장바구니",
};

// TODO(WSB-013): 비회원 장바구니 상태(Zustand) + 라인아이템 연동. 현재는 빈 상태 UI.
export default function CartPage() {
  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">장바구니</h1>

      <div className="mt-16 flex flex-col items-center text-center">
        <ShoppingBag
          className="size-10 text-wabi-fg-muted/40"
          strokeWidth={1}
          aria-hidden
        />
        <p className="mt-6 text-sm text-wabi-fg-muted">
          장바구니가 비어 있습니다.
        </p>
        <Button
          asChild
          className="mt-8 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90"
        >
          <Link href="/shop">쇼핑 계속하기</Link>
        </Button>
      </div>
    </Container>
  );
}

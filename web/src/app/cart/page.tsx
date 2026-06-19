"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Minus, Plus, X, ImageIcon } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { useCart, cartTotal } from "@/store/cart";
import { useMounted } from "@/hooks/use-mounted";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart(cartTotal);
  const mounted = useMounted();

  // 영속 store 복원 전(SSR/첫 페인트)에는 빈 상태로 깜빡이지 않게 가드
  if (!mounted) {
    return (
      <Container className="py-16">
        <h1 className="text-2xl font-semibold tracking-wide">장바구니</h1>
      </Container>
    );
  }

  if (items.length === 0) {
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

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">장바구니</h1>

      <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-5">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <ImageIcon
                  className="size-6 text-wabi-fg-muted/40"
                  strokeWidth={1}
                  aria-hidden
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.name}</p>
              <p className="mt-1 text-xs text-wabi-fg-muted">
                {won(item.price)}
              </p>
            </div>

            {/* 수량 */}
            <div className="flex items-center border border-wabi-border">
              <button
                type="button"
                aria-label="수량 감소"
                onClick={() => setQty(item.id, item.quantity - 1)}
                className="p-2 hover:bg-wabi-muted"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-8 text-center text-sm" aria-live="polite">
                {item.quantity}
              </span>
              <button
                type="button"
                aria-label="수량 증가"
                onClick={() => setQty(item.id, item.quantity + 1)}
                className="p-2 hover:bg-wabi-muted"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <p className="w-24 text-right text-sm">
              {won(item.price * item.quantity)}
            </p>

            <button
              type="button"
              aria-label={`${item.name} 삭제`}
              onClick={() => remove(item.id)}
              className="p-2 text-wabi-fg-muted hover:text-wabi-fg"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      {/* 합계 */}
      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-wabi-fg-muted">총 결제금액</span>
        <span className="text-xl font-semibold">{won(total)}</span>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          asChild
          variant="outline"
          className="rounded-none border-wabi-fg px-8"
        >
          <Link href="/shop">쇼핑 계속하기</Link>
        </Button>
        {/* TODO(WSB-014~019): 결제 플로우. 비회원은 로그인 유도. */}
        <Button
          asChild
          className="rounded-none bg-wabi-accent px-10 hover:bg-wabi-accent/90"
        >
          <Link href="/auth?redirect=/checkout">주문하기</Link>
        </Button>
      </div>
    </Container>
  );
}

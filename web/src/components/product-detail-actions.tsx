"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/store/cart";

type Props = {
  product: Omit<CartItem, "quantity">;
  stock: number;
};

export function ProductDetailActions({ product, stock }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const soldOut = stock <= 0;

  function clamp(n: number) {
    return Math.max(1, Math.min(stock, n));
  }

  return (
    <div className="mt-8 space-y-4">
      {/* 수량 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-wabi-fg-muted">수량</span>
        <div className="flex items-center border border-wabi-border">
          <button
            type="button"
            aria-label="수량 감소"
            disabled={soldOut}
            onClick={() => setQty((q) => clamp(q - 1))}
            className="p-2 hover:bg-wabi-muted disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-10 text-center text-sm" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="수량 증가"
            disabled={soldOut || qty >= stock}
            onClick={() => setQty((q) => clamp(q + 1))}
            className="p-2 hover:bg-wabi-muted disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <span className="text-xs text-wabi-fg-muted">
          {soldOut ? "품절" : `재고 ${stock}개`}
        </span>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={soldOut}
          onClick={() => add(product, qty)}
          className="flex-1 rounded-none border-wabi-fg"
        >
          장바구니
        </Button>
        <Button
          type="button"
          disabled={soldOut}
          onClick={() => {
            add(product, qty);
            router.push("/cart");
          }}
          className="flex-1 rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          바로 구매
        </Button>
      </div>
    </div>
  );
}

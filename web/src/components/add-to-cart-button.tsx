"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/store/cart";
import { cn } from "@/lib/utils";

type Props = {
  product: Omit<CartItem, "quantity">;
  className?: string;
  // 품절 (#131) — 목록에서도 담기를 막는다. 담더라도 결제 시 재고 검증(0010)에
  // 걸리지만, 담긴 뒤에야 알게 되는 건 나쁜 경험이다.
  soldOut?: boolean;
};

export function AddToCartButton({ product, className, soldOut }: Props) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (soldOut) {
    return (
      <Button
        type="button"
        disabled
        aria-label={`${product.name} 품절`}
        className={cn("rounded-none", className)}
      >
        품절
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleAdd}
      aria-label={`${product.name} 장바구니에 담기`}
      className={cn(
        "rounded-none bg-wabi-accent hover:bg-wabi-accent/90",
        className,
      )}
    >
      {added ? (
        <>
          <Check className="size-4" /> 담김
        </>
      ) : (
        <>
          <Plus className="size-4" /> 담기
        </>
      )}
    </Button>
  );
}

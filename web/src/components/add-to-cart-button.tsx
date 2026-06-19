"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/store/cart";
import { cn } from "@/lib/utils";

type Props = {
  product: Omit<CartItem, "quantity">;
  className?: string;
};

export function AddToCartButton({ product, className }: Props) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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

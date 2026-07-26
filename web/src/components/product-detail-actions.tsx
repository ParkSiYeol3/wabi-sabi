"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/store/cart";
import { ADDONS, won } from "@/lib/addons";

type Props = {
  product: Omit<CartItem, "quantity" | "addons">;
  stock: number;
};

export function ProductDetailActions({ product, stock }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [addons, setAddons] = useState<string[]>([]);
  // 담기 직후 잠깐 "담겼습니다 ✓" 로 바꿔 클릭이 먹혔음을 알린다(대표님 요청).
  const [added, setAdded] = useState(false);
  const soldOut = stock <= 0;

  function clamp(n: number) {
    return Math.max(1, Math.min(stock, n));
  }

  const toggleAddon = (code: string, checked: boolean) =>
    setAddons((prev) =>
      checked ? [...prev, code] : prev.filter((c) => c !== code),
    );

  return (
    <div className="mt-8 space-y-4">
      {/* 추가 옵션 (#253) — 상세에서 선택 후 담는다. 선물 메시지는 결제 화면에서.
          fieldset/legend 로 스크린리더에 옵션 그룹임을 알린다. */}
      <fieldset>
        <legend className="text-sm text-wabi-fg-muted">추가 옵션</legend>
        <div className="mt-2 space-y-1.5">
          {ADDONS.map((a) => (
            <label key={a.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addons.includes(a.code)}
                onChange={(e) => toggleAddon(a.code, e.target.checked)}
                disabled={soldOut}
              />
              {a.name} (+{won(a.price)})
            </label>
          ))}
        </div>
      </fieldset>

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
        {/* 재고 수량은 숨긴다(대표님) — 품절 여부만 표시. */}
        {soldOut && (
          <span className="text-xs text-wabi-fg-muted">품절</span>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={soldOut}
          onClick={() => {
            add(product, qty, addons);
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1500);
          }}
          aria-live="polite"
          className="flex-1 rounded-none border-wabi-fg"
        >
          {added ? "담겼습니다 ✓" : "장바구니"}
        </Button>
        <Button
          type="button"
          disabled={soldOut}
          onClick={() => {
            add(product, qty, addons);
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/price";
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

  // 스티키 바에 보여줄 합계 — 수량 × 단가 + 선택한 애드온.
  const addonSum = ADDONS.filter((a) => addons.includes(a.code)).reduce(
    (s, a) => s + a.price,
    0,
  );
  const total = product.price * qty + addonSum;

  function addToCart() {
    add(product, qty, addons);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }
  function buyNow() {
    add(product, qty, addons);
    router.push("/cart");
  }

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
              {a.name} (+<span className="font-numeric">{won(a.price)}</span>)
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
            className="flex size-11 items-center justify-center hover:bg-wabi-muted disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>
          <span
            className="w-10 text-center font-numeric text-sm"
            aria-live="polite"
          >
            {qty}
          </span>
          <button
            type="button"
            aria-label="수량 증가"
            disabled={soldOut || qty >= stock}
            onClick={() => setQty((q) => clamp(q + 1))}
            className="flex size-11 items-center justify-center hover:bg-wabi-muted disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        {/* 재고 수량은 숨긴다(대표님) — 품절 여부만 표시. */}
        {soldOut && (
          <span className="text-xs text-wabi-fg-muted">품절</span>
        )}
      </div>

      {/* 데스크톱 — 인라인 버튼(정보 옆에서 바로 보임). 모바일은 하단 스티키 바로 대체. */}
      <div className="hidden gap-3 md:flex">
        <Button
          type="button"
          variant="outline"
          disabled={soldOut}
          onClick={addToCart}
          aria-live="polite"
          className="flex-1 rounded-none border-wabi-fg"
        >
          {added ? "담겼습니다 ✓" : "장바구니"}
        </Button>
        <Button
          type="button"
          disabled={soldOut}
          onClick={buyNow}
          className="flex-1 rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          바로 구매
        </Button>
      </div>

      {/* 모바일 스티키 구매 바 — 사진·스펙·리뷰를 스크롤해도 담기/구매가 항상 손닿는
          곳에 있게(커머스 표준). 합계는 수량·애드온 반영. 데스크톱은 위 인라인 사용.
          safe-area 로 아이폰 홈 인디케이터를 피한다. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-wabi-border bg-wabi-bg/95 px-4 py-3 backdrop-blur md:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <p className="min-w-0 flex-1 text-lg font-semibold text-wabi-fg">
          <Price value={total} />
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={soldOut}
          onClick={addToCart}
          aria-live="polite"
          className="rounded-none border-wabi-fg px-4"
        >
          {added ? "담김 ✓" : soldOut ? "품절" : "장바구니"}
        </Button>
        <Button
          type="button"
          disabled={soldOut}
          onClick={buyNow}
          className="rounded-none bg-wabi-accent px-5 hover:bg-wabi-accent/90"
        >
          바로 구매
        </Button>
      </div>
    </div>
  );
}

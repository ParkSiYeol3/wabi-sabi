"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Minus, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/product/price";
import { useCart, type CartItem } from "@/store/cart";
import { won, type Addon } from "@/lib/addons";
import type { OptionGroup, SelectedOption } from "@/lib/product-options";
import { cn } from "@/lib/utils";

type Props = {
  product: Omit<CartItem, "quantity" | "addons" | "options">;
  stock: number;
  // 상품 커스텀 옵션(색상·모양 등, 0048) — 손님이 골라야 담을 수 있다.
  options: OptionGroup[];
  // 이 상품 상세에 노출할 추가옵션(0048 enabled_addons 로 필터된 것). 비면 블록 숨김.
  addons: Addon[];
  /** 애드온 코드별 썸네일 URL(대표님 어드민 업로드). 없으면 사진 자리만 표시. */
  addonImages?: Record<string, string | undefined>;
};

export function ProductDetailActions({
  product,
  stock,
  options,
  addons,
  addonImages,
}: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  // 커스텀 옵션 선택 — 그룹명 → 고른 값. 그룹이 있으면 전부 골라야 담기 활성.
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    {},
  );
  // 담기 직후 잠깐 "담겼습니다 ✓" 로 바꿔 클릭이 먹혔음을 알린다(대표님 요청).
  const [added, setAdded] = useState(false);
  const soldOut = stock <= 0;

  const optionsChosen = options.every((g) => !!selectedOptions[g.name]);
  const canBuy = !soldOut && optionsChosen;

  function clamp(n: number) {
    return Math.max(1, Math.min(stock, n));
  }

  const toggleAddon = (code: string, checked: boolean) =>
    setSelectedAddons((prev) =>
      checked ? [...prev, code] : prev.filter((c) => c !== code),
    );

  // 선택된 옵션 스냅샷(장바구니·주문에 실린다) — 정의된 그룹 순서로.
  const optionSnapshot = (): SelectedOption[] =>
    options
      .map((g) => ({ name: g.name, value: selectedOptions[g.name] }))
      .filter((o): o is SelectedOption => !!o.value);

  // 스티키 바에 보여줄 합계 — 수량 × 단가 + 선택한 애드온(옵션은 가격 영향 없음).
  const addonSum = addons
    .filter((a) => selectedAddons.includes(a.code))
    .reduce((s, a) => s + a.price, 0);
  const total = product.price * qty + addonSum;

  function addToCart() {
    if (!canBuy) return;
    add(product, qty, selectedAddons, optionSnapshot());
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }
  function buyNow() {
    if (!canBuy) return;
    add(product, qty, selectedAddons, optionSnapshot());
    router.push("/cart");
  }

  return (
    <div className="mt-8 space-y-4">
      {/* 커스텀 옵션(색상·모양 등, #253 확장) — 손님이 상세에서 선택. 그룹마다 하나씩
          고른다(선택만 — 가격 영향 없음). 미선택 시 담기/구매 비활성. */}
      {options.length > 0 && (
        <div className="space-y-3">
          {options.map((g) => (
            <fieldset key={g.name}>
              <legend className="text-sm text-wabi-fg-muted">{g.name}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.values.map((v) => {
                  const active = selectedOptions[g.name] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={soldOut}
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedOptions((s) => ({ ...s, [g.name]: v }))
                      }
                      className={cn(
                        "border px-3 py-1.5 text-sm transition-colors disabled:opacity-40",
                        active
                          ? "border-wabi-fg bg-wabi-fg text-white"
                          : "border-wabi-border text-wabi-fg hover:border-wabi-fg",
                      )}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {!optionsChosen && !soldOut && (
            <p className="text-xs text-wabi-accent">옵션을 선택해 주세요.</p>
          )}
        </div>
      )}

      {/* 추가 옵션 (#253) — 상세에서 선택 후 담는다. 상품별 노출 토글(0048)로
          걸러진 것만. 노출할 게 없으면 블록 전체를 숨긴다. */}
      {addons.length > 0 && (
        <fieldset>
          <legend className="text-sm text-wabi-fg-muted">추가 옵션</legend>
          <div className="mt-2 space-y-2">
            {addons.map((a) => {
              const img = addonImages?.[a.code];
              return (
                <label
                  key={a.code}
                  className="flex items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(a.code)}
                    onChange={(e) => toggleAddon(a.code, e.target.checked)}
                    disabled={soldOut}
                    className="shrink-0"
                  />
                  {/* 옵션 사진 — 대표님 어드민 업로드. 없으면 사진 자리(플레이스홀더). */}
                  <span className="relative size-12 shrink-0 overflow-hidden rounded border border-wabi-border bg-wabi-muted">
                    {img ? (
                      <Image
                        src={img}
                        alt={a.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center">
                        <ImageIcon
                          className="size-5 text-wabi-fg-muted/40"
                          strokeWidth={1}
                          aria-hidden
                        />
                      </span>
                    )}
                  </span>
                  {/* 이름 + 가격 — 가격은 줄바꿈 방지(nowrap)로 "(+4,000원)"이 쪼개지지 않게. */}
                  <span className="min-w-0 flex-1">
                    {a.name}{" "}
                    <span className="whitespace-nowrap text-wabi-fg-muted">
                      (+<span className="font-numeric">{won(a.price)}</span>)
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

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
        {/* 재고 수량은 숨긴다(대표님) — 품절 여부만 표시(영문 라벨로 통일). */}
        {soldOut && (
          <span className="text-xs text-wabi-fg-muted">Out of Stock</span>
        )}
      </div>

      {/* 데스크톱 — 인라인 버튼(정보 옆에서 바로 보임). 모바일은 하단 스티키 바로 대체. */}
      <div className="hidden gap-3 md:flex">
        <Button
          type="button"
          variant="outline"
          disabled={!canBuy}
          onClick={addToCart}
          aria-live="polite"
          className="flex-1 rounded-none border-wabi-fg"
        >
          {added ? "담겼습니다 ✓" : "장바구니"}
        </Button>
        <Button
          type="button"
          disabled={!canBuy}
          onClick={buyNow}
          className="flex-1 rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          바로 구매
        </Button>
      </div>

      {/* 모바일 구매 바 — 사진·스펙·리뷰를 스크롤해도 담기/구매가 항상 손닿는 곳에
          있게(커머스 표준). 합계는 수량·애드온 반영. 데스크톱은 위 인라인 사용.
          화면 가장자리에 딱 붙으면 답답해(대표님) 좌우·하단을 띄운 라운드 카드로
          떠 있게 하고, safe-area 로 아이폰 홈 인디케이터를 피한다. 바깥 래퍼는
          투명 여백이 스크롤을 막지 않게 pointer-events-none, 카드만 auto. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto mx-3 flex items-center gap-2 rounded-2xl border border-wabi-border bg-wabi-bg/95 px-4 py-3 shadow-[0_6px_28px_rgba(0,0,0,0.12)] backdrop-blur">
          <p className="min-w-0 flex-1 text-lg font-semibold text-wabi-fg">
            <Price value={total} />
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!canBuy}
            onClick={addToCart}
            aria-live="polite"
            className="rounded-none border-wabi-fg px-4"
          >
            {added ? "담김 ✓" : soldOut ? "품절" : "장바구니"}
          </Button>
          <Button
            type="button"
            disabled={!canBuy}
            onClick={buyNow}
            className="rounded-none bg-wabi-accent px-5 hover:bg-wabi-accent/90"
          >
            바로 구매
          </Button>
        </div>
      </div>
    </div>
  );
}

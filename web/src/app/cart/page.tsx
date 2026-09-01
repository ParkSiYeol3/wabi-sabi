"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Minus, Plus, X, ImageIcon } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { useCart, cartTotal } from "@/store/cart";
import { useMounted } from "@/hooks/use-mounted";
import { resolveAddons, addonsTotal } from "@/lib/addons";
import { Price } from "@/components/product/price";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart(cartTotal);
  const mounted = useMounted();
  // 라인별 애드온(#253) 합산 — cartTotal 은 상품가만이라 별도로 더한다.
  const addonSum = items.reduce((n, i) => n + addonsTotal(i.addons), 0);

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

      {/* 모바일(375px)에선 [이미지+정보]가 첫 줄, 수량·금액·삭제가 아래 줄로
          내려간다(flex-wrap + 컨트롤 묶음 w-full). 고정폭 요소가 한 줄에 다
          들어가지 못해 이름·가격이 세로로 깨지던 문제 해결. sm+ 은 한 줄 유지. */}
      <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap"
          >
            {/* 이미지+상품정보는 상세 페이지로 이동(대표님). 수량·삭제 컨트롤은
                링크 밖에 둔다(중첩 인터랙션 방지). group 으로 상품명 hover 밑줄. */}
            <Link
              href={`/shop/${item.id}`}
              className="group flex min-w-0 flex-1 items-center gap-4"
            >
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
                <p className="truncate text-sm underline-offset-4 group-hover:underline">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-wabi-fg-muted">
                  <Price value={item.price} />
                </p>
                {/* 커스텀 옵션(색상·모양 등, 0048) — 가격 영향 없음. 배포 전 저장된
                    게스트 장바구니엔 options 가 없을 수 있어 옵셔널 체이닝으로 가드. */}
                {item.options?.length ? (
                  <p className="mt-1 text-xs text-wabi-fg-muted">
                    {item.options.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                  </p>
                ) : null}
                {item.addons.length > 0 && (
                  <p className="mt-1 text-xs text-wabi-fg-muted">
                    + {resolveAddons(item.addons).map((a) => a.name).join(", ")}
                  </p>
                )}
              </div>
            </Link>

            {/* 컨트롤 묶음 — 모바일은 둘째 줄(w-full)로 내려 수량·금액·삭제를 나란히,
                sm+ 은 인라인(w-auto). */}
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:gap-4">
              <div className="flex items-center border border-wabi-border">
                <button
                  type="button"
                  aria-label="수량 감소"
                  onClick={() => setQty(item.id, item.quantity - 1)}
                  className="flex size-11 items-center justify-center hover:bg-wabi-muted"
                >
                  <Minus className="size-3.5" />
                </button>
                <span
                  className="w-8 text-center font-numeric text-sm"
                  aria-live="polite"
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label="수량 증가"
                  onClick={() => setQty(item.id, item.quantity + 1)}
                  className="flex size-11 items-center justify-center hover:bg-wabi-muted"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <p className="text-right text-sm sm:w-24">
                <Price
                  value={
                    item.price * item.quantity + addonsTotal(item.addons)
                  }
                />
              </p>

              <button
                type="button"
                aria-label={`${item.name} 삭제`}
                onClick={() => remove(item.id)}
                className="flex size-11 shrink-0 items-center justify-center text-wabi-fg-muted transition-colors hover:text-wabi-fg"
              >
                <X className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* 합계 */}
      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-wabi-fg-muted">총 결제금액</span>
        <span className="text-xl font-semibold">
          <Price value={total + addonSum} />
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          asChild
          variant="outline"
          className="rounded-none border-wabi-fg px-8"
        >
          <Link href="/shop">쇼핑 계속하기</Link>
        </Button>
        {/* 결제 플로우 — 회원·비회원 모두 /checkout 진입 가능(게스트 주문 허용) */}
        <Button
          asChild
          className="rounded-none bg-wabi-accent px-10 hover:bg-wabi-accent/90"
        >
          <Link href="/checkout">주문하기</Link>
        </Button>
      </div>
    </Container>
  );
}

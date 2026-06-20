"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, cartTotal } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useMounted } from "@/hooks/use-mounted";
import { won } from "@/lib/orders";
import { createPendingOrder } from "./actions";

const GIFT_PRICE = 3000;
const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const items = useCart((s) => s.items);
  const subtotal = useCart(cartTotal);

  const [gift, setGift] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (!user) router.replace("/auth?redirect=/checkout");
    else if (items.length === 0) router.replace("/cart");
  }, [mounted, user, items.length, router]);

  if (!mounted || !user || items.length === 0) {
    return (
      <Container className="py-16">
        <span className="sr-only">로딩 중</span>
      </Container>
    );
  }

  const total = subtotal + (gift ? GIFT_PRICE : 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!CLIENT_KEY) {
      setError(
        "토스페이먼츠 키가 설정되지 않았습니다 (.env.local NEXT_PUBLIC_TOSS_CLIENT_KEY).",
      );
      return;
    }

    const fd = new FormData(e.currentTarget);
    const delivery = {
      recipient: String(fd.get("recipient") || ""),
      phone: String(fd.get("phone") || ""),
      postcode: String(fd.get("postcode") || ""),
      address: String(fd.get("address") || ""),
      detail: String(fd.get("detail") || ""),
      memo: String(fd.get("memo") || ""),
    };
    const giftInput = {
      enabled: gift,
      sender: String(fd.get("sender") || ""),
      message: String(fd.get("message") || ""),
    };

    setLoading(true);
    try {
      const res = await createPendingOrder(
        items.map((i) => ({ id: i.id, quantity: i.quantity })),
        delivery,
        giftInput,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }

      const toss = await loadTossPayments(CLIENT_KEY);
      const payment = toss.payment({ customerKey: user!.id });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: res.amount },
        orderId: res.orderId,
        orderName: res.orderName,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: user!.email ?? undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 요청 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">주문/결제</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <form className="space-y-12" onSubmit={onSubmit}>
          <section>
            <h2 className="text-lg font-medium">배송지</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input name="recipient" required placeholder="받는 분" className="rounded-none" />
              <Input name="phone" required placeholder="연락처" className="rounded-none" />
              <Input name="postcode" placeholder="우편번호" className="rounded-none" />
              <Input name="address" required placeholder="주소" className="rounded-none" />
              <Input name="detail" placeholder="상세주소" className="rounded-none sm:col-span-2" />
              <Input name="memo" placeholder="배송 메모 (선택)" className="rounded-none sm:col-span-2" />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium">선물 포장</h2>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
              선물 포장하기 (+{won(GIFT_PRICE)})
            </label>
            {gift && (
              <div className="mt-4 grid gap-3">
                <Input name="sender" placeholder="보내는 분" className="rounded-none" />
                <textarea
                  name="message"
                  rows={3}
                  placeholder="메시지 카드 내용"
                  className="resize-none border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none focus:border-wabi-fg"
                />
              </div>
            )}
          </section>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-wabi-accent py-6 text-base hover:bg-wabi-accent/90"
          >
            {loading ? "처리 중…" : `토스페이먼츠로 ${won(total)} 결제`}
          </Button>
        </form>

        <aside className="h-fit border border-wabi-border p-6">
          <h2 className="text-lg font-medium">주문 요약</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-wabi-fg-muted">
                  {i.name} × {i.quantity}
                </span>
                <span>{won(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-wabi-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-wabi-fg-muted">상품 합계</dt>
              <dd>{won(subtotal)}</dd>
            </div>
            {gift && (
              <div className="flex justify-between">
                <dt className="text-wabi-fg-muted">선물 포장</dt>
                <dd>{won(GIFT_PRICE)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-2 text-base font-semibold">
              <dt>총 결제금액</dt>
              <dd>{won(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </Container>
  );
}

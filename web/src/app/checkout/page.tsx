"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadTossPayments,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";
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
  const authLoading = useAuthStore((s) => s.loading);
  const items = useCart((s) => s.items);
  const subtotal = useCart(cartTotal);

  const [gift, setGift] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const total = subtotal + (gift ? GIFT_PRICE : 0);

  // 로그인·장바구니 가드 (인증 로딩 끝난 뒤 판단 — 레이스 방지)
  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!user) router.replace("/auth?redirect=/checkout");
    else if (items.length === 0) router.replace("/cart");
  }, [mounted, authLoading, user, items.length, router]);

  // 결제위젯 렌더 (1회)
  useEffect(() => {
    if (!mounted || !user || items.length === 0 || !CLIENT_KEY) return;
    let cancelled = false;

    (async () => {
      try {
        const toss = await loadTossPayments(CLIENT_KEY);
        const widgets = toss.widgets({ customerKey: user.id });
        await widgets.setAmount({ currency: "KRW", value: total });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (cancelled) return;
        widgetsRef.current = widgets;
        setWidgetReady(true);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "결제위젯 로드 실패");
      }
    })();

    return () => {
      cancelled = true;
    };
    // 1회 초기화 — total 변경은 아래 effect에서 setAmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user, items.length]);

  // 금액 변경 시 위젯 갱신
  useEffect(() => {
    if (widgetReady && widgetsRef.current) {
      widgetsRef.current.setAmount({ currency: "KRW", value: total });
    }
  }, [total, widgetReady]);

  if (!mounted || authLoading || !user || items.length === 0) {
    return (
      <Container className="py-16">
        <span className="sr-only">로딩 중</span>
      </Container>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!CLIENT_KEY) {
      setError("토스페이먼츠 키 미설정 (.env.local NEXT_PUBLIC_TOSS_CLIENT_KEY).");
      return;
    }
    if (!widgetsRef.current) {
      setError("결제위젯이 아직 준비되지 않았습니다.");
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
      await widgetsRef.current.requestPayment({
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

      <form
        className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]"
        onSubmit={onSubmit}
      >
        {/* 좌: 배송지·선물·결제수단 */}
        <div className="space-y-12">
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

          <section>
            <h2 className="text-lg font-medium">결제 수단</h2>
            {!CLIENT_KEY && (
              <p className="mt-3 text-sm text-red-600">
                토스페이먼츠 키 미설정 — .env.local에 NEXT_PUBLIC_TOSS_CLIENT_KEY 추가.
              </p>
            )}
            <div id="payment-method" className="mt-4" />
            <div id="agreement" className="mt-2" />
          </section>
        </div>

        {/* 우: 주문 요약 + 결제 버튼 */}
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

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !widgetReady}
            className="mt-6 w-full rounded-none bg-wabi-accent py-6 text-base hover:bg-wabi-accent/90"
          >
            {loading ? "처리 중…" : `${won(total)} 결제하기`}
          </Button>
        </aside>
      </form>
    </Container>
  );
}

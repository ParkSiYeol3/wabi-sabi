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
import {
  createPendingOrder,
  getMyAddresses,
  type SavedAddress,
} from "./actions";

const EMPTY_DELIVERY = {
  recipient: "",
  phone: "",
  postcode: "",
  address: "",
  detail: "",
  memo: "",
};

const GIFT_PRICE = 3000;
const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

// 결제창(window) 방식 — API 개별 연동 키 사용 (결제위젯은 전자결제 계약 후 전환).
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
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!user) router.replace("/auth?redirect=/checkout");
    else if (items.length === 0) router.replace("/cart");
  }, [mounted, authLoading, user, items.length, router]);

  // 저장 배송지 로드 — 있으면 가장 최근 것을 자동 채움(수정 가능).
  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyAddresses().then((list) => {
      if (!active) return;
      setAddresses(list);
      const a = list[0];
      if (a)
        setDelivery((d) => ({
          ...d,
          recipient: a.recipient,
          phone: a.phone,
          postcode: a.postcode ?? "",
          address: a.address,
          detail: a.detail ?? "",
        }));
    });
    return () => {
      active = false;
    };
  }, [user]);

  const setField =
    (key: keyof typeof EMPTY_DELIVERY) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDelivery((d) => ({ ...d, [key]: e.target.value }));

  function applyAddress(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setDelivery((d) => ({
      ...d,
      recipient: a.recipient,
      phone: a.phone,
      postcode: a.postcode ?? "",
      address: a.address,
      detail: a.detail ?? "",
    }));
  }

  if (!mounted || authLoading || !user || items.length === 0) {
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
      setError("토스페이먼츠 키 미설정 (.env.local NEXT_PUBLIC_TOSS_CLIENT_KEY).");
      return;
    }

    const fd = new FormData(e.currentTarget);
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

      <form
        className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]"
        onSubmit={onSubmit}
      >
        <div className="space-y-12">
          <section>
            <h2 className="text-lg font-medium">배송지</h2>

            {/* 저장된 배송지 선택 (#162) */}
            {addresses.length > 0 && (
              <select
                aria-label="저장된 배송지 선택"
                defaultValue={addresses[0]?.id}
                onChange={(e) => applyAddress(e.target.value)}
                className="mt-4 w-full rounded-none border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none focus:border-wabi-fg sm:max-w-md"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.recipient} · {a.address}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input name="recipient" required placeholder="받는 분" className="rounded-none" value={delivery.recipient} onChange={setField("recipient")} />
              <Input name="phone" required placeholder="연락처" className="rounded-none" value={delivery.phone} onChange={setField("phone")} />
              <Input name="postcode" placeholder="우편번호" className="rounded-none" value={delivery.postcode} onChange={setField("postcode")} />
              <Input name="address" required placeholder="주소" className="rounded-none" value={delivery.address} onChange={setField("address")} />
              <Input name="detail" placeholder="상세주소" className="rounded-none sm:col-span-2" value={delivery.detail} onChange={setField("detail")} />
              <Input name="memo" placeholder="배송 메모 (선택)" className="rounded-none sm:col-span-2" value={delivery.memo} onChange={setField("memo")} />
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
        </div>

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
            disabled={loading}
            className="mt-6 w-full rounded-none bg-wabi-accent py-6 text-base hover:bg-wabi-accent/90"
          >
            {loading ? "처리 중…" : `${won(total)} 결제하기`}
          </Button>
        </aside>
      </form>
    </Container>
  );
}

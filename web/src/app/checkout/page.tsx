"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, cartTotal } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useMounted } from "@/hooks/use-mounted";
import { won } from "@/lib/orders";
import { addonsTotal, GIFT_WRAP_CODE } from "@/lib/addons";
import { shippingFeeFor, amountToFreeShipping } from "@/lib/shipping";
import { Price } from "@/components/product/price";
import { PostcodeButton } from "@/components/common/postcode-button";
import {
  createPendingOrder,
  getMyAddresses,
  getMyCoupons,
  type SavedAddress,
} from "./actions";
import {
  couponDiscount,
  couponUsable,
  couponLabel,
  type Coupon,
} from "@/lib/coupons";

const EMPTY_DELIVERY = {
  recipient: "",
  phone: "",
  postcode: "",
  address: "",
  detail: "",
  memo: "",
};

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

// 결제창(window) 방식 — API 개별 연동 키 사용 (결제위젯은 전자결제 계약 후 전환).
export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const items = useCart((s) => s.items);
  const subtotal = useCart(cartTotal);

  // 애드온은 이제 라인 단위(상세에서 선택 — #253). 결제 화면은 라인별 애드온을
  // 합산해 보여주고, 선물 포장이 담긴 라인이 있으면 메시지만 받는다.
  const giftInCart = items.some((i) => i.addons.includes(GIFT_WRAP_CODE));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  // 쿠폰(0059) — 로그인 사용자의 지갑 중 유효한 것. 선택 시 subtotal 에서 할인.
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  // 자동 채움은 최초 1회만 — user 참조가 갱신돼도 사용자가 수정 중인 값을 덮지 않게.
  const autoFilledRef = useRef(false);

  useEffect(() => {
    if (!mounted || authLoading) return;
    // 비회원도 구매 가능(대표님) — 로그인 게이트 제거. 빈 장바구니만 되돌린다.
    if (items.length === 0) router.replace("/cart");
  }, [mounted, authLoading, items.length, router]);

  // 저장 배송지 로드 — 있으면 가장 최근 것을 최초 1회만 자동 채움(이후 수정 가능).
  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyAddresses().then((list) => {
      if (!active) return;
      setAddresses(list);
      if (!autoFilledRef.current && list[0]) {
        autoFilledRef.current = true;
        fillFrom(list[0]);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  // 내 쿠폰 로드(로그인 시). 서버가 결제 시 다시 검증하므로 여기선 표시·선택만.
  // 로그아웃 시 목록 비우기는 렌더 시점(activeCoupons)에서 파생한다(effect 내 동기
  // setState 회피). 선택 id 가 남아도 activeCoupons 가 비면 할인은 0 이 된다.
  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyCoupons().then((list) => {
      if (active) setCoupons(list);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const setField =
    (key: keyof typeof EMPTY_DELIVERY) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDelivery((d) => ({ ...d, [key]: e.target.value }));

  // 저장 주소를 배송지 필드에 채운다(메모는 유지).
  function fillFrom(a: SavedAddress) {
    setDelivery((d) => ({
      ...d,
      recipient: a.recipient,
      phone: a.phone,
      postcode: a.postcode ?? "",
      address: a.address,
      detail: a.detail ?? "",
    }));
  }

  function onSelectAddress(id: string) {
    if (id === "") {
      // 직접 입력 — 배송지 필드 초기화(메모는 유지).
      setDelivery((d) => ({ ...EMPTY_DELIVERY, memo: d.memo }));
      return;
    }
    const a = addresses.find((x) => x.id === id);
    if (a) fillFrom(a);
  }

  // 비회원도 결제 가능(대표님 — 게스트 구매 허용). 렌더 가드에서 !user 를 뺀다.
  // (이전엔 게스트가 이 가드에 걸려 결제 폼을 못 보고 로딩만 떴다 — 미완성 버그.
  //  아래 user 참조는 전부 user?. 또는 !user 가드로 null 안전.) 빈 장바구니만 되돌린다.
  if (!mounted || authLoading || items.length === 0) {
    return (
      <Container className="py-16">
        <span className="sr-only">로딩 중</span>
      </Container>
    );
  }

  const addonSum = items.reduce((n, i) => n + addonsTotal(i.addons), 0);
  // 배송비 — 서버(actions)와 동일 정책으로 미리보기. 확정 금액은 서버가 재계산.
  const merchandise = subtotal + addonSum;
  const shipping = shippingFeeFor(merchandise);
  const freeGap = amountToFreeShipping(merchandise);
  // 쿠폰 할인 — 선택 쿠폰이 현재 subtotal 에서 사용 가능할 때만 적용(서버와 동일 계산).
  // 로그아웃 시엔 목록을 비워(파생) 남은 선택이 적용되지 않게 한다.
  const activeCoupons = user ? coupons : [];
  const selectedCoupon =
    activeCoupons.find((c) => c.id === selectedCouponId) ?? null;
  const couponOk = selectedCoupon
    ? couponUsable(selectedCoupon, merchandise).ok
    : false;
  const discount =
    selectedCoupon && couponOk ? couponDiscount(selectedCoupon, merchandise) : 0;
  const appliedCouponId = discount > 0 ? selectedCouponId : null;
  const total = merchandise + shipping - discount;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!CLIENT_KEY) {
      setError("토스페이먼츠 키 미설정 (.env.local NEXT_PUBLIC_TOSS_CLIENT_KEY).");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const giftInput = {
      sender: String(fd.get("sender") || ""),
      message: String(fd.get("message") || ""),
    };

    setLoading(true);
    try {
      const res = await createPendingOrder(
        items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          addons: i.addons,
          options: i.options,
        })),
        delivery,
        giftInput,
        appliedCouponId,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }

      const toss = await loadTossPayments(CLIENT_KEY);
      // 비회원은 토스 ANONYMOUS 키로 일회성 결제(대표님 — 게스트 구매 허용).
      const payment = toss.payment({ customerKey: user?.id ?? ANONYMOUS });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: res.amount },
        orderId: res.orderId,
        orderName: res.orderName,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: user?.email ?? undefined,
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

            {/* 저장된 배송지 선택 (#162) — '직접 입력'으로 초기화 가능 */}
            {addresses.length > 0 && (
              <select
                aria-label="저장된 배송지 선택"
                defaultValue={addresses[0]?.id}
                onChange={(e) => onSelectAddress(e.target.value)}
                className="mt-4 w-full rounded-none border border-wabi-border bg-transparent px-3 py-2 text-base outline-none focus:border-wabi-fg sm:max-w-md md:text-sm"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.recipient} · {a.address}
                  </option>
                ))}
                <option value="">직접 입력</option>
              </select>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input name="recipient" required aria-label="받는 분" placeholder="받는 분" className="rounded-none" value={delivery.recipient} onChange={setField("recipient")} />
              <Input name="phone" required aria-label="연락처" placeholder="연락처" className="rounded-none font-numeric" value={delivery.phone} onChange={setField("phone")} />
              <div className="flex gap-2">
                <Input name="postcode" aria-label="우편번호" placeholder="우편번호" className="rounded-none font-numeric" value={delivery.postcode} onChange={setField("postcode")} />
                <PostcodeButton
                  onComplete={(r) =>
                    setDelivery((d) => ({ ...d, postcode: r.zonecode, address: r.address }))
                  }
                />
              </div>
              <Input name="address" required aria-label="주소" placeholder="주소" className="rounded-none font-numeric" value={delivery.address} onChange={setField("address")} />
              <Input name="detail" aria-label="상세주소" placeholder="상세주소" className="rounded-none font-numeric sm:col-span-2" value={delivery.detail} onChange={setField("detail")} />
              <Input name="memo" aria-label="배송 메모" placeholder="배송 메모 (선택)" className="rounded-none sm:col-span-2" value={delivery.memo} onChange={setField("memo")} />
            </div>
          </section>

          {/* 추가 옵션은 상품 상세에서 선택(#253). 선물 포장이 담긴 라인이 있으면
              메시지·보내는 분만 여기서 받는다(주문당 1개). */}
          {giftInCart && (
            <section>
              <h2 className="text-lg font-medium">선물 메시지</h2>
              <div className="mt-4 grid gap-3">
                <Input name="sender" aria-label="보내는 분" placeholder="보내는 분" className="rounded-none" />
                <textarea
                  name="message"
                  rows={3}
                  aria-label="메시지 카드 내용"
                  placeholder="메시지 카드 내용"
                  className="resize-none border border-wabi-border bg-transparent px-3 py-2 text-base outline-none focus:border-wabi-fg md:text-sm"
                />
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit border border-wabi-border p-6">
          <h2 className="text-lg font-medium">주문 요약</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-wabi-fg-muted">
                  {i.name} × <span className="font-numeric">{i.quantity}</span>
                </span>
                <Price value={i.price * i.quantity} />
              </li>
            ))}
          </ul>

          {/* 쿠폰(0059) — 내 지갑의 유효 쿠폰. 최소주문 미달은 비활성(사유 표시). */}
          {activeCoupons.length > 0 && (
            <div className="mt-6 border-t border-wabi-border pt-4">
              <p className="text-sm font-medium text-wabi-fg">쿠폰</p>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-wabi-fg-muted">
                  <input
                    type="radio"
                    name="coupon"
                    checked={!selectedCouponId}
                    onChange={() => setSelectedCouponId(null)}
                    className="size-4"
                  />
                  적용 안 함
                </label>
                {activeCoupons.map((c) => {
                  const usable = couponUsable(c, merchandise);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start gap-2 text-sm ${
                        usable.ok ? "text-wabi-fg" : "text-wabi-fg-muted/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="coupon"
                        disabled={!usable.ok}
                        checked={selectedCouponId === c.id}
                        onChange={() => setSelectedCouponId(c.id)}
                        className="mt-0.5 size-4"
                      />
                      <span>
                        <span className="font-medium">{couponLabel(c)}</span>
                        {c.description ? ` · ${c.description}` : ""}
                        {!usable.ok && (
                          <span className="block text-xs text-wabi-fg-muted/70">
                            {usable.reason}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <dl className="mt-6 space-y-2 border-t border-wabi-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-wabi-fg-muted">상품 합계</dt>
              <dd><Price value={subtotal} /></dd>
            </div>
            {addonSum > 0 && (
              <div className="flex justify-between">
                <dt className="text-wabi-fg-muted">추가 옵션</dt>
                <dd><Price value={addonSum} /></dd>
              </div>
            )}
            {/* 배송비 — 서버와 동일 정책(lib/shipping)으로 미리보기. 무료면 "무료". */}
            <div className="flex justify-between">
              <dt className="text-wabi-fg-muted">배송비</dt>
              <dd className={shipping === 0 ? "text-wabi-fg-muted" : undefined}>
                {shipping === 0 ? "무료" : <Price value={shipping} />}
              </dd>
            </div>
            {freeGap > 0 && (
              <p className="pt-1 text-xs text-wabi-accent">
                {won(freeGap)} 더 담으면 무료배송!
              </p>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-wabi-accent">
                <dt>쿠폰 할인</dt>
                <dd>
                  −<Price value={discount} />
                </dd>
              </div>
            )}
            <div className="flex justify-between pt-2 text-base font-semibold">
              <dt>총 결제금액</dt>
              <dd><Price value={total} /></dd>
            </div>
          </dl>

          {error && (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-none bg-wabi-accent py-6 text-base hover:bg-wabi-accent/90"
          >
            {loading ? (
              "처리 중…"
            ) : (
              <>
                <span className="font-numeric">{won(total)}</span> 결제하기
              </>
            )}
          </Button>
        </aside>
      </form>
    </Container>
  );
}

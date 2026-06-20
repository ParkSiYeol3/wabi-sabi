import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { ClearCart } from "@/components/clear-cart";
import { createClient } from "@/lib/supabase/server";
import { won } from "@/lib/orders";

type SP = { paymentKey?: string; orderId?: string; amount?: string };

async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return { ok: false, error: "토스 시크릿 키 미설정" };

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.message || "결제 승인 실패" };
  }
  return { ok: true };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  let success = false;
  let message = "결제 정보가 올바르지 않습니다.";

  if (paymentKey && orderId && amount) {
    const confirm = await confirmTossPayment(paymentKey, orderId, Number(amount));
    if (confirm.ok) {
      // 토스 승인 성공 → 주문 확정(paid) + 재고 차감
      const supabase = await createClient();
      const { error } = await supabase.rpc("confirm_order", {
        p_order_id: orderId,
      });
      if (!error) {
        success = true;
      } else {
        message = "주문 확정 처리 중 오류가 발생했습니다.";
      }
    } else {
      message = confirm.error ?? "결제 승인 실패";
    }
  }

  return (
    <Container className="flex flex-col items-center py-28 text-center">
      {success ? (
        <>
          <ClearCart />
          <CheckCircle2 className="size-12 text-wabi-fg" strokeWidth={1.2} />
          <h1 className="mt-6 text-2xl font-semibold">주문이 완료되었습니다</h1>
          <p className="mt-3 text-sm text-wabi-fg-muted">
            결제금액 {won(Number(amount))}
          </p>
          <div className="mt-10 flex gap-3">
            <Button asChild variant="outline" className="rounded-none border-wabi-fg px-8">
              <Link href="/mypage/orders">주문 내역</Link>
            </Button>
            <Button asChild className="rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90">
              <Link href="/shop">쇼핑 계속하기</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <XCircle className="size-12 text-red-600" strokeWidth={1.2} />
          <h1 className="mt-6 text-2xl font-semibold">결제를 완료하지 못했습니다</h1>
          <p className="mt-3 text-sm text-wabi-fg-muted">{message}</p>
          <Button asChild className="mt-10 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90">
            <Link href="/cart">장바구니로</Link>
          </Button>
        </>
      )}
    </Container>
  );
}

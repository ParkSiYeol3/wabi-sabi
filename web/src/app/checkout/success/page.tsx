import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { ClearCart } from "@/components/clear-cart";
import { confirmPayment } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { won } from "@/lib/orders";

type SP = { paymentKey?: string; orderId?: string; amount?: string };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  let success = false;
  let message = "결제 정보가 올바르지 않습니다.";

  if (paymentKey && orderId) {
    // 승인·확정은 서버 공용 로직(lib/payments) — 금액은 DB 주문 기준(쿼리 amount 불신),
    // 확정 RPC 는 service_role 전용(0009), 새로고침/웹훅 중복에 멱등.
    const confirm = await confirmPayment(paymentKey, orderId);
    if (confirm.ok) {
      success = true;
      // 서버 장바구니도 여기서 즉시 비운다(#215) — 클라 ClearCart 는 auth
      // 바인딩 전에 돌 수 있어 로컬만 비우면 이후 동기화가 서버 항목을
      // 되살린다. 본인 행만 지워지므로(RLS) 사용자 클라이언트로 충분. 멱등.
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cart_items").delete().eq("user_id", user.id);
      }
    } else message = confirm.error ?? "결제 승인 실패";
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
          <XCircle className="size-12 text-red-700" strokeWidth={1.2} />
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

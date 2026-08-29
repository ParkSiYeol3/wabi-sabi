import Link from "next/link";
import { XCircle } from "lucide-react";
import { Container } from "@/components/layout/container";
import { OrderCompleteMark } from "@/components/checkout/order-complete-mark";
import { Button } from "@/components/ui/button";
import { ClearCart } from "@/components/common/clear-cart";
import { confirmPayment } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { Price } from "@/components/product/price";

type SP = { paymentKey?: string; orderId?: string; amount?: string };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  let success = false;
  let message = "결제 정보가 올바르지 않습니다.";
  // 비회원 주문(user_id null)이면 주문 내역 페이지가 없으므로 버튼을 숨기고 안내한다.
  let isMember = false;
  // 주문번호 — 비회원은 이 번호로 나중에 비회원 주문조회를 하므로 화면에 노출한다.
  let orderNumber: string | null = null;

  if (paymentKey && orderId) {
    // 승인·확정은 서버 공용 로직(lib/payments) — 금액은 DB 주문 기준(쿼리 amount 불신),
    // 확정 RPC 는 service_role 전용(0009), 새로고침/웹훅 중복에 멱등.
    const confirm = await confirmPayment(paymentKey, orderId);
    if (confirm.ok) {
      success = true;
      // 주문번호 조회 — 주문은 RLS(본인 전용)라 게스트는 못 읽으므로 admin 으로 읽는다.
      if (adminConfigured()) {
        const { data } = await createAdminClient()
          .from("orders")
          .select("order_number")
          .eq("id", orderId)
          .maybeSingle<{ order_number: string }>();
        orderNumber = data?.order_number ?? null;
      }
      // 서버 장바구니도 여기서 즉시 비운다(#215) — 클라 ClearCart 는 auth
      // 바인딩 전에 돌 수 있어 로컬만 비우면 이후 동기화가 서버 항목을
      // 되살린다. 본인 행만 지워지므로(RLS) 사용자 클라이언트로 충분. 멱등.
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        isMember = true;
        await supabase.from("cart_items").delete().eq("user_id", user.id);
      }
    } else message = confirm.error ?? "결제 승인 실패";
  }

  return (
    <Container className="flex flex-col items-center py-28 text-center">
      {success ? (
        <>
          <ClearCart />
          <OrderCompleteMark />
          <h1 className="mt-6 text-2xl font-semibold">주문이 완료되었습니다</h1>
          <p className="mt-3 text-sm text-wabi-fg-muted">
            결제금액 <Price value={Number(amount)} />
          </p>
          {orderNumber && (
            <p className="mt-1 text-sm text-wabi-fg-muted">
              주문번호 <span className="font-medium">{orderNumber}</span>
            </p>
          )}
          {/* 비회원은 주문 내역 페이지가 없다 — 주문번호를 안내하고 비회원 주문조회로 유도. */}
          {!isMember && (
            <p className="mt-4 max-w-md text-xs leading-relaxed text-wabi-fg-muted">
              비회원 주문이 완료되었습니다. <b>주문번호</b>를 저장해 두시면{" "}
              <Link href="/order-lookup" className="underline underline-offset-2">
                비회원 주문조회
              </Link>
              에서 전화번호와 함께 배송 상태를 확인하실 수 있습니다.
            </p>
          )}
          <div className="mt-10 flex gap-3">
            {isMember && (
              <Button asChild variant="outline" className="rounded-none border-wabi-fg px-8">
                <Link href="/mypage/orders">주문 내역</Link>
              </Button>
            )}
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

"use client";

import { useActionState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  subscribeRestock,
  unsubscribeRestock,
} from "@/app/shop/[id]/restock-actions";

// 품절 상품 재입고 알림 신청/취소 (#166). 로그인 사용자에게만 노출.
// 재고가 다시 들어오면 어드민 재고 수정 시점에 메일이 1회 발송된다.
export function RestockButton({
  productId,
  initial,
}: {
  productId: string;
  initial: boolean;
}) {
  // 액션이 실패하면 이전 상태를 유지한다 — 실패를 무시하고 토글하면 알림을
  // 받는 것처럼 보이지만 실제로는 구독되지 않는다.
  const [subscribed, action, pending] = useActionState<boolean, FormData>(
    async (prev, formData) => {
      const ok = prev
        ? await unsubscribeRestock(formData)
        : await subscribeRestock(formData);
      if (!ok) return prev;
      return !prev;
    },
    initial,
  );

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="product_id" value={productId} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="w-full rounded-none border-wabi-fg"
      >
        {subscribed ? (
          <>
            <BellOff className="size-4" /> 재입고 알림 취소
          </>
        ) : (
          <>
            <BellRing className="size-4" /> 재입고 알림 받기
          </>
        )}
      </Button>
      <p className="mt-2 text-xs text-wabi-fg-muted">
        {subscribed
          ? "재입고되면 가입 이메일로 알려드립니다."
          : "재입고되면 이메일로 알려드립니다."}
      </p>
    </form>
  );
}

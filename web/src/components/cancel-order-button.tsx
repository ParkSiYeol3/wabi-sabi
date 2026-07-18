"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelMyOrder } from "@/app/mypage/orders/actions";

// 주문 취소 버튼 — paid(배송 전) 주문에만 렌더. 확인 후 전액 취소·환불.
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onCancel = () => {
    if (!window.confirm("주문을 취소할까요? 결제 금액은 전액 환불됩니다."))
      return;
    setError(null);
    startTransition(async () => {
      const result = await cancelMyOrder(orderId);
      if (result.ok) router.refresh();
      else setError(result.error ?? "주문 취소에 실패했습니다.");
    });
  };

  return (
    <div className="text-right">
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={pending}
        className="rounded-none border-wabi-border text-xs text-wabi-fg-muted hover:text-wabi-fg"
      >
        {pending ? "취소 처리 중…" : "주문 취소"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}

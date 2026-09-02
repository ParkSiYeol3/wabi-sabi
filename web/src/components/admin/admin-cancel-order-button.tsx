"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { adminCancelOrder } from "@/app/admin/orders/actions";

// 관리자 주문 취소 버튼 — paid(배송 전) 주문에만 렌더. 확인 모달 후 전액 취소·환불.
// 실환불이 걸린 액션이라 클릭 즉시 실행하지 않고 반드시 모달로 한 번 더 확인받는다.
export function AdminCancelOrderButton({
  orderId,
  orderNumber,
  fullWidth = false,
}: {
  orderId: string;
  orderNumber: string;
  /** 모바일 카드에서 버튼을 가로 꽉 채워 터치 타깃 확보. */
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 배경 스크롤 잠금 · Escape 닫기 · 초기 포커스 · 포커스 트랩 · 복귀(a11y).
  const dialogRef = useModalA11y(confirmOpen, () => {
    if (!pending) setConfirmOpen(false);
  });

  const doCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminCancelOrder(orderId);
      if (result.ok) {
        setConfirmOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "주문 취소에 실패했습니다.");
        setConfirmOpen(false);
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className={`${fullWidth ? "w-full justify-center py-2.5" : ""} cursor-pointer rounded-lg border border-wabi-border px-2.5 py-1.5 text-xs text-wabi-fg-muted transition-colors hover:border-red-700 hover:text-red-700 disabled:opacity-60`}
      >
        {pending ? "취소 처리 중…" : "주문 취소"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!pending) setConfirmOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="w-full max-w-sm border border-wabi-border bg-wabi-bg p-6 text-left shadow-lg outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium tracking-[0.2em] text-wabi-fg-muted">
              WABI-SABI · 관리자
            </p>
            <h2
              id="admin-cancel-title"
              className="mt-2 text-lg font-medium text-wabi-fg"
            >
              주문 {orderNumber}을(를) 취소할까요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-wabi-fg-muted">
              결제 금액이 <b className="text-wabi-fg">전액 환불</b>되고 재고·쿠폰이
              복원됩니다. 되돌릴 수 없어요. 배송이 시작된 주문은 취소할 수 없습니다.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
                className="rounded-none border-wabi-border text-wabi-fg-muted hover:text-wabi-fg"
              >
                닫기
              </Button>
              <Button
                size="sm"
                onClick={doCancel}
                disabled={pending}
                className="rounded-none bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
              >
                {pending ? "취소 처리 중…" : "취소·환불"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

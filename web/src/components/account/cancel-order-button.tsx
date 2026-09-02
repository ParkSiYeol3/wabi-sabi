"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { cancelMyOrder } from "@/app/mypage/orders/actions";

// 주문 취소 버튼 — paid(배송 전) 주문에만 렌더. 확인 후 전액 취소·환불.
// 확인 창은 window.confirm 을 쓰지 않는다 — 브라우저 네이티브 confirm 은 상단에
// "wasa.kr 내용:" 처럼 도메인이 노출돼 브랜드감이 깨진다(대표님). 자체 모달로
// "WABI-SABI" 제목을 달아 브랜드 톤을 지킨다(nickname-gate 모달과 동일 패턴).
export function CancelOrderButton({ orderId }: { orderId: string }) {
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
      const result = await cancelMyOrder(orderId);
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
    <div className="text-right">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="rounded-none border-wabi-border text-xs text-wabi-fg-muted hover:text-wabi-fg"
      >
        {pending ? "취소 처리 중…" : "주문 취소"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
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
              WABI-SABI
            </p>
            <h2
              id="cancel-order-title"
              className="mt-2 text-lg font-medium text-wabi-fg"
            >
              주문을 취소할까요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-wabi-fg-muted">
              결제 금액은 전액 환불됩니다. 취소 후에는 되돌릴 수 없어요.
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
                className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
              >
                {pending ? "취소 처리 중…" : "주문 취소"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

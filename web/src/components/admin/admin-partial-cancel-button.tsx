"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { won } from "@/lib/orders";
import {
  adminPartialCancel,
  adminRetryPartialRefund,
} from "@/app/admin/orders/actions";

// 품절 상품 부분취소 버튼(#844) — 결제 완료(배송 전) 주문의 상품 줄마다. 확인 모달에서
// 수량을 고르고 환불 금액을 미리 보여 준 뒤 실행한다. 금액은 서버(RPC)가 다시 계산하고,
// 여기 미리보기는 같은 규칙(단가 × 수량, 줄 전체면 추가옵션 포함)을 따른다.
export function AdminPartialCancelButton({
  orderId,
  orderNumber,
  itemId,
  productName,
  unitPrice,
  quantity,
  addonTotal,
  maxCancel,
}: {
  orderId: string;
  orderNumber: string;
  itemId: string;
  productName: string;
  unitPrice: number;
  /** 이 줄의 남은 수량. */
  quantity: number;
  /** 이 줄의 추가옵션 합(줄 전체를 취소할 때만 환불). */
  addonTotal: number;
  /** 취소할 수 있는 최대 수량 — 주문에 상품이 최소 1개는 남아야 한다. */
  maxCancel: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const dialogRef = useModalA11y(open, () => {
    if (!pending) setOpen(false);
  });

  const refund = unitPrice * count + (count === quantity ? addonTotal : 0);
  const titleId = `partial-cancel-${itemId}`;

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminPartialCancel(orderId, itemId, count);
      setOpen(false);
      if (!result.ok) setError(result.error ?? "부분취소에 실패했습니다.");
      router.refresh();
    });
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => {
          setCount(1);
          setOpen(true);
        }}
        disabled={pending}
        className="cursor-pointer rounded-md border border-wabi-border px-2 py-1 text-[11px] whitespace-nowrap text-wabi-fg-muted transition-colors hover:border-red-700 hover:text-red-700 disabled:opacity-60"
      >
        {pending ? "처리 중…" : "품절 취소"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!pending) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="w-full max-w-sm border border-wabi-border bg-wabi-bg p-6 text-left shadow-lg outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium tracking-[0.2em] text-wabi-fg-muted">
              WABI-SABI · 주문 {orderNumber}
            </p>
            <h2 id={titleId} className="mt-2 text-lg font-medium break-keep text-wabi-fg">
              ‘{productName}’ 품절 취소
            </h2>

            {maxCancel > 1 && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-wabi-fg-muted">취소 수량</span>
                <div className="flex items-center border border-wabi-border">
                  <button
                    type="button"
                    aria-label="수량 줄이기"
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    disabled={pending || count <= 1}
                    className="flex size-9 cursor-pointer items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="w-10 text-center font-numeric text-sm">{count}</span>
                  <button
                    type="button"
                    aria-label="수량 늘리기"
                    onClick={() => setCount((n) => Math.min(maxCancel, n + 1))}
                    disabled={pending || count >= maxCancel}
                    className="flex size-9 cursor-pointer items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>
                <span className="text-xs text-wabi-fg-muted">/ {quantity}개 중</span>
              </div>
            )}

            <p className="mt-4 text-sm text-wabi-fg-muted">
              환불 금액{" "}
              <b className="font-numeric text-base text-wabi-fg">{won(refund)}</b>
            </p>
            <p className="mt-2 text-sm leading-6 text-wabi-fg-muted">
              이 금액만 결제 수단으로 환불되고 <b className="text-wabi-fg">배송비·쿠폰은 그대로</b>
              예요. 재고가 다시 채워지고 손님께 안내 메일이 가요. 되돌릴 수 없어요.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-none border-wabi-border text-wabi-fg-muted hover:text-wabi-fg"
              >
                닫기
              </Button>
              <Button
                size="sm"
                onClick={run}
                disabled={pending}
                className="rounded-none bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
              >
                {pending ? "처리 중…" : `${won(refund)} 환불`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 부분취소는 됐는데 토스 환불이 확인되지 않은 기록(#844) — 다시 시도. 이미 환불된 건 기록만
// 맞추고, 돌려줄 금액이 남지 않았으면 환불하지 않는다(서버가 판단).
export function AdminRetryRefundButton({
  cancelId,
  label,
}: {
  cancelId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await adminRetryPartialRefund(cancelId);
            if (!result.ok) setError(result.error ?? "환불에 실패했습니다.");
            router.refresh();
          });
        }}
        className="cursor-pointer rounded-md border border-amber-400 px-2 py-1 text-[11px] whitespace-nowrap text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-60"
      >
        {pending ? "환불 중…" : `${label} 환불 다시 시도`}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

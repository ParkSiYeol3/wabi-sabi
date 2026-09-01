"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDeleteOrder } from "@/app/admin/orders/actions";

// 관리자 주문 기록 삭제 버튼(대표님) — 확인 모달 후 DB 기록 영구 삭제.
// 결제/환불과 무관하게 기록만 지운다. 되돌릴 수 없어 반드시 모달로 한 번 더 확인.
export function AdminDeleteOrderButton({
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

  useEffect(() => {
    if (!confirmOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [confirmOpen, pending]);

  const doDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminDeleteOrder(orderId);
      if (result.ok) {
        setConfirmOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "주문 삭제에 실패했습니다.");
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
        className={`${fullWidth ? "w-full justify-center py-2.5" : ""} inline-flex cursor-pointer items-center gap-1 rounded-lg border border-wabi-border px-2.5 py-1.5 text-xs text-wabi-fg-muted transition-colors hover:border-red-700 hover:text-red-700 disabled:opacity-60`}
      >
        <Trash2 className="size-3.5" aria-hidden />
        {pending ? "삭제 중…" : "기록 삭제"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!pending) setConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm border border-wabi-border bg-wabi-bg p-6 text-left shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium tracking-[0.2em] text-wabi-fg-muted">
              WABI-SABI · 관리자
            </p>
            <h2
              id="admin-delete-title"
              className="mt-2 text-lg font-medium text-wabi-fg"
            >
              주문 {orderNumber} 기록을 삭제할까요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-wabi-fg-muted">
              주문 기록이 <b className="text-wabi-fg">영구 삭제</b>됩니다. 되돌릴 수
              없어요. 결제·환불과는 무관하게 기록만 지웁니다 — 결제된 주문은 먼저
              <b className="text-wabi-fg"> 취소(환불)</b> 후 삭제하세요.
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
                onClick={doDelete}
                disabled={pending}
                className="rounded-none bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
              >
                {pending ? "삭제 중…" : "기록 삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

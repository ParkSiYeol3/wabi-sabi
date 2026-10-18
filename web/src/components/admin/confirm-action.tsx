"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/common/submit-button";
import { useModalA11y } from "@/lib/use-modal-a11y";

// 되돌릴 수 없는 서버 액션 앞의 확인 창(대표님 2026-10-18: 사진 ×를 잘못 누르면 바로
// 지워져 복구가 어렵다). 트리거를 누르면 창이 뜨고, 창 안의 폼이 실제 액션을 제출한다.
// 다른 관리자 확인 창(주문 취소·기록 삭제)과 같은 모양.
export function ConfirmAction({
  action,
  fields,
  title,
  description,
  preview,
  confirmLabel,
  pendingText,
  trigger,
  triggerLabel,
  triggerClassName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** 폼에 hidden 으로 실을 값. */
  fields: Record<string, string>;
  title: string;
  description: ReactNode;
  /** 무엇이 지워지는지 보여 줄 것(사진 등). */
  preview?: ReactNode;
  confirmLabel: string;
  pendingText: string;
  trigger: ReactNode;
  /** 트리거가 아이콘뿐이면 스크린리더용 이름. */
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useModalA11y(open, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
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
            <h2 id={titleId} className="mt-2 text-lg font-medium break-keep text-wabi-fg">
              {title}
            </h2>
            {preview && <div className="mt-3">{preview}</div>}
            <div className="mt-2 text-sm leading-6 text-wabi-fg-muted">{description}</div>
            <form action={action} className="mt-6 flex justify-end gap-2">
              {Object.entries(fields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="rounded-none border-wabi-border text-wabi-fg-muted hover:text-wabi-fg"
              >
                닫기
              </Button>
              <SubmitButton
                pendingText={pendingText}
                className="inline-flex h-8 cursor-pointer items-center rounded-none bg-red-700 px-3 text-sm text-white hover:bg-red-800"
              >
                {confirmLabel}
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

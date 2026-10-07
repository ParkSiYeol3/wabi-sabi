"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkTrackingNow } from "@/app/admin/orders/actions";

// 택배 조회 버튼(#815, 다른 택배사 #818). 자동 조회되는 택배사(우체국·조회 키가 있는 CJ·한진·
// 롯데·로젠)의 배송 중 주문에만 렌더. 누르면 지금 택배사에 물어보고, 배달완료면 실제 배달
// 시각으로 배송완료 처리된다(서버). 결과 문장을 버튼 아래에 보여 준다.
export function EpostCheckButton({
  orderId,
  label,
  fullWidth = false,
}: {
  orderId: string;
  /** 택배사 이름(예: 우체국, CJ대한통운) → "우체국 조회". */
  label: string;
  /** 모바일 카드에서 버튼을 가로 꽉 채워 터치 타깃 확보. */
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null);

  const check = () => {
    setResult(null);
    startTransition(async () => {
      const r = await checkTrackingNow(orderId);
      if (!r.ok) {
        setResult({ text: r.error, error: true });
        return;
      }
      setResult({ text: r.text, error: false });
      if (r.delivered) router.refresh();
    });
  };

  return (
    <div className={fullWidth ? "w-full" : undefined}>
      <button
        type="button"
        onClick={check}
        disabled={pending}
        className={`${fullWidth ? "w-full py-2.5" : "py-1.5"} inline-flex cursor-pointer items-center justify-center rounded-lg border border-wabi-border px-2.5 text-xs whitespace-nowrap transition-colors hover:border-wabi-fg hover:bg-wabi-muted/50 disabled:opacity-60`}
      >
        {pending ? "조회 중…" : `${label} 조회`}
      </button>
      {result && (
        <p
          role="status"
          className={`mt-1 text-xs ${result.error ? "text-red-700" : "text-wabi-fg-muted"}`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}

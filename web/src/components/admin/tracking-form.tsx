import { SubmitButton } from "@/components/common/submit-button";
import { setTracking } from "@/app/admin/orders/actions";
import { COURIERS, DEFAULT_COURIER, trackingUrl } from "@/lib/orders";

// 송장 입력 폼 — 표 셀·모바일 카드 공용(모바일은 입력칸이 남는 폭을 채운다).
// 택배사(#756)는 송장 앞에서 고른다. 기본 우체국(대표님 평소). 저장하는 순간 배송 메일이
// 나가므로 택배사를 먼저 맞추게 번호 칸 앞에 둔다.
export function TrackingForm({
  order: o,
}: {
  order: {
    id: string;
    order_number: string;
    tracking_number: string | null;
    courier: string | null;
  };
}) {
  return (
    <form action={setTracking} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={o.id} />
      <select
        name="courier"
        defaultValue={o.courier ?? DEFAULT_COURIER}
        aria-label={`주문 ${o.order_number} 택배사`}
        className="shrink-0 cursor-pointer rounded-lg border border-wabi-border bg-wabi-bg/60 px-1.5 py-1.5 text-sm outline-none transition-colors focus:border-wabi-fg"
      >
        {Object.entries(COURIERS).map(([code, c]) => (
          <option key={code} value={code}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        name="tracking_number"
        defaultValue={o.tracking_number ?? ""}
        aria-label={`주문 ${o.order_number} 송장번호`}
        placeholder="송장번호"
        className="w-36 min-w-0 flex-1 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-wabi-fg sm:flex-none"
      />
      <SubmitButton
        pendingText="저장 중…"
        className="cursor-pointer rounded-lg px-2 py-1.5 text-xs whitespace-nowrap text-wabi-fg-muted underline-offset-2 transition-colors hover:text-wabi-fg hover:underline"
      >
        저장
      </SubmitButton>
      {o.tracking_number && (
        <a
          href={trackingUrl(o.courier, o.tracking_number)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-wabi-fg-muted underline-offset-2 transition-colors hover:text-wabi-fg hover:underline"
        >
          조회<span className="sr-only"> (새 창 열림)</span>
        </a>
      )}
    </form>
  );
}

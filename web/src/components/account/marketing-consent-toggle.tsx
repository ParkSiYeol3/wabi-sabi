"use client";

import { useActionState } from "react";
import { setMarketingConsent, type ConsentResult } from "@/app/account-actions";

// 마케팅 수신 동의 토글(#671) — 소셜 가입 회원은 동의할 자리가 아예 없었고, 이메일
// 가입 회원도 가입 때 체크한 값을 나중에 바꿀 수 없었다. 켜고 끌 때마다 user_consents 에
// 한 행이 쌓여 동의·철회 이력이 남는다(정보통신망법 — 수신 거부 수단).
// 체크박스 하나짜리 폼이라 onChange 에서 바로 제출한다(별도 저장 버튼 없음).
export function MarketingConsentToggle({ initial }: { initial: boolean }) {
  const [state, action, pending] = useActionState<ConsentResult | null, FormData>(
    async (prev, formData) => setMarketingConsent(prev, formData),
    null,
  );

  // 서버가 확정한 값이 있으면 그것을, 없으면 초기값을 보여준다.
  const checked = state?.ok ? state.agreed : initial;

  return (
    <form action={action}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="agreed"
          defaultChecked={checked}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-wabi-accent disabled:opacity-50"
        />
        <span className="text-sm leading-6 text-wabi-fg-muted">
          <span className="text-wabi-fg">신상품·이벤트 소식을 메일로 받기</span>
          <span className="ml-2 text-xs">(선택 · 언제든 끌 수 있습니다)</span>
          {pending && <span className="ml-2 text-xs">저장 중…</span>}
          {!pending && state && (
            <span
              role="status"
              className={`ml-2 text-xs ${state.ok ? "text-green-700" : "text-red-700"}`}
            >
              {state.message}
            </span>
          )}
        </span>
      </label>
    </form>
  );
}

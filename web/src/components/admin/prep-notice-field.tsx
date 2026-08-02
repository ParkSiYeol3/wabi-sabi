"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { togglePrepNotice } from "@/app/admin/content/actions";
import type { ActionResult } from "@/app/admin/products/types";

// 정식 오픈 준비중 안내 on/off 토글(대표님) — 체크 후 저장하면 방문자 진입 시
// 안내 모달이 뜨거나 사라진다. 문구는 아래 별도 편집칸(ContentField)에서 고친다.
export function PrepNoticeField({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    togglePrepNotice,
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="enabled" value={on ? "on" : "off"} />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span className="leading-6">
          홈·상품 등 모든 페이지 진입 시{" "}
          <strong className="font-medium text-wabi-fg">
            &ldquo;정식 오픈 준비중&rdquo;
          </strong>{" "}
          안내창을 표시합니다. 방문자는 닫고 자유롭게 둘러볼 수 있습니다.
        </span>
      </label>
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
        {state && (
          <span
            role="status"
            className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
          >
            {state.ok ? "✓ " : ""}
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

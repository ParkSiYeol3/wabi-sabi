"use client";

import { useActionState } from "react";
import {
  toggleCategoryActive,
  deleteCategory,
} from "@/app/admin/categories/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { SubmitButton } from "@/components/submit-button";

// 카테고리 행 도구 (0036) — 숨김/노출 토글 + 빈 분류 삭제.
// 삭제는 서버가 하위·상품 유무를 재검증하고 결과 메시지를 돌려준다.
export function CategoryTools({
  id,
  isActive,
  deletable,
}: {
  id: string;
  isActive: boolean;
  // 렌더 시점 기준 하위·상품 없음 — 버튼 노출 판단용(서버가 최종 검증)
  deletable: boolean;
}) {
  const [state, deleteAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(deleteCategory, null);

  return (
    <div className="flex items-center gap-3">
      <form action={toggleCategoryActive}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="is_active" value={String(isActive)} />
        <SubmitButton
          pendingText="변경 중…"
          className="cursor-pointer text-xs underline underline-offset-2 transition-colors hover:text-wabi-accent"
        >
          {isActive ? "노출중" : "숨김"}
        </SubmitButton>
      </form>
      {deletable && (
        <form action={deleteAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer text-xs text-red-700 underline underline-offset-2 transition-colors hover:text-red-800 disabled:opacity-60"
          >
            {pending ? "삭제 중…" : "삭제"}
          </button>
        </form>
      )}
      {state && !state.ok && (
        <span role="status" className="text-xs text-red-700">
          {state.message}
        </span>
      )}
    </div>
  );
}

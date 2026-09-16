"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { createCoupon, type CouponActionResult } from "@/app/admin/coupons/actions";
import type { CouponDiscountType } from "@/lib/coupons";

// 쿠폰 등록 폼(대표님). 정액(원)·정률(%)·무료배송 선택.
// 최소주문·기간·총한도·1인한도·가입지급.
export function CouponCreateForm() {
  const [state, action, pending] = useActionState<
    CouponActionResult | null,
    FormData
  >(async (_p, fd) => createCoupon(_p, fd), null);
  const [type, setType] = useState<CouponDiscountType>("fixed");

  const input =
    "border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none focus:border-wabi-fg";

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs text-wabi-fg-muted">
        코드 (영문 대문자·숫자)
        <input name="code" required placeholder="WELCOME3000" className={input} />
      </label>
      <label className="grid gap-1 text-xs text-wabi-fg-muted">
        설명 (손님에게 표시)
        <input name="description" placeholder="가입 축하 쿠폰" className={input} />
      </label>

      <label className="grid gap-1 text-xs text-wabi-fg-muted">
        할인 방식
        <select
          name="discount_type"
          value={type}
          onChange={(e) => setType(e.target.value as CouponDiscountType)}
          className={input}
        >
          <option value="fixed">정액 (원)</option>
          <option value="percent">정률 (%)</option>
          <option value="free_shipping">무료배송</option>
        </select>
      </label>
      {/* 무료배송은 깎을 금액이 그 주문의 배송비로 정해져 있어 입력칸이 없다(0066).
          서버 검증이 할인값을 1 이상으로 요구하므로 쓰이지 않는 값 1을 보낸다. */}
      {type === "free_shipping" ? (
        <div className="grid gap-1 text-xs text-wabi-fg-muted">
          할인값
          <input type="hidden" name="discount_value" value="1" />
          <p className="px-3 py-2 text-xs leading-5 text-wabi-fg-muted">
            배송비만큼 자동으로 깎입니다. 이미 무료배송인 주문에는 사용할 수 없어요.
          </p>
        </div>
      ) : (
        <label className="grid gap-1 text-xs text-wabi-fg-muted">
          할인값 {type === "percent" ? "(%)" : "(원)"}
          <input
            name="discount_value"
            type="number"
            min={1}
            required
            placeholder={type === "percent" ? "10" : "3000"}
            className={`${input} font-numeric`}
          />
        </label>
      )}

      <label className="grid gap-1 text-xs text-wabi-fg-muted">
        최소 주문금액 (원, 없으면 0)
        <input
          name="min_order"
          type="number"
          min={0}
          defaultValue={0}
          className={`${input} font-numeric`}
        />
      </label>
      {type === "percent" && (
        <label className="grid gap-1 text-xs text-wabi-fg-muted">
          최대 할인 상한 (원, 선택)
          <input
            name="max_discount"
            type="number"
            min={1}
            placeholder="예: 5000"
            className={`${input} font-numeric`}
          />
        </label>
      )}

      <label className="grid gap-1 text-xs text-wabi-fg-muted">
        만료일시 (선택 — 없으면 무기한)
        <input name="expires_at" type="datetime-local" className={input} />
      </label>
      <label className="grid gap-1 text-xs text-wabi-fg-muted">
        총 사용 한도 (선택 — 없으면 무제한)
        <input
          name="max_uses"
          type="number"
          min={0}
          placeholder="예: 100"
          className={`${input} font-numeric`}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-wabi-fg-muted sm:col-span-2">
        <input type="checkbox" name="auto_issue_signup" className="size-4" />
        신규 회원가입 시 자동 지급 (예: 가입 축하 쿠폰)
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "등록 중…" : "쿠폰 등록"}
        </Button>
        {state && (
          <span
            className={`text-sm ${state.ok ? "text-wabi-fg-muted" : "text-red-700"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

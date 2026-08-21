"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProduct } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { OriginPicker } from "@/components/admin/origin-picker";
import { AttributePicker } from "@/components/admin/attribute-picker";
import { CareMultiPicker } from "@/components/admin/care-multi-picker";
import { ProductOptionsFields } from "@/components/admin/product-options-fields";
import { MATERIALS, SIZES, CARES } from "@/lib/product-attributes";
import type { OptionGroup } from "@/lib/product-options";

type Category = { id: string; name_ko: string; name_en: string };

export type ProductEditValues = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_monthly: boolean;
  description: string | null;
  material: string | null;
  size: string | null;
  care: string | null;
  origin: string | null;
  options: OptionGroup[];
  enabledAddons: string[];
};

// 기존 상품 본문 수정 폼 (대표님 지시 — 이미 올린 상품 글 수정).
// 재고·이미지는 목록 화면이 담당(재입고 알림 경로 일원화) — 여기선 본문만.
// uncontrolled + defaultValue: 서버 값 프리필, 저장 성공 후에도 값 유지가 자연.
export function ProductEditForm({
  product,
  categories,
}: {
  product: ProductEditValues;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateProduct, null);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={product.id} />
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        상품명
        <Input
          name="name"
          required
          maxLength={120}
          defaultValue={product.name}
          className="rounded-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        가격 (원)
        <Input
          name="price"
          type="number"
          min={0}
          required
          defaultValue={product.price}
          className="rounded-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        카테고리
        <select
          name="category_id"
          defaultValue={product.category_id ?? ""}
          className="h-9 border border-wabi-border bg-transparent px-3 text-sm"
        >
          <option value="">카테고리 없음</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ko} ({c.name_en})
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-wabi-fg-muted">
        <input
          type="checkbox"
          name="is_monthly"
          defaultChecked={product.is_monthly}
          className="size-4"
        />
        월간 그릇
      </label>
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted sm:col-span-2">
        상품 설명 (상세 페이지에 표시)
        <textarea
          name="description"
          rows={6}
          maxLength={2000}
          defaultValue={product.description ?? ""}
          className="resize-y border border-wabi-border bg-transparent px-3 py-2 text-sm text-wabi-fg outline-none transition-colors focus:border-wabi-fg"
        />
      </label>
      {/* 상세 스펙 — 프리셋 드롭다운 + 직접 입력(대표님). 비우면 상세에서 행 생략.
          기존 값이 프리셋에 없으면 직접 입력 모드로 시작해 값 보존. */}
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        소재
        <AttributePicker
          name="material"
          label="소재"
          options={MATERIALS}
          initial={product.material ?? ""}
          emptyLabel="소재 선택 안 함"
          customPlaceholder="소재 직접 입력 (예: 도자기)"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        원산지
        <OriginPicker initial={product.origin ?? ""} />
      </label>
      {/* 사이즈 — 치수 형식 프리셋(Ø× 등) 드롭다운. 고르면 편집칸에 채워져 숫자만
          이어 적는다(presetAsTemplate). 기존 값이 있으면 직접 입력 모드로 시작해 보존. */}
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        사이즈
        <AttributePicker
          name="size"
          label="사이즈"
          options={SIZES}
          presetAsTemplate
          initial={product.size ?? ""}
          emptyLabel="사이즈 선택 안 함"
          customPlaceholder="사이즈 (예: Ø20×12 h2.5 · 지름 12cm)"
        />
      </label>
      {/* 주의사항 — 복수 선택 + 직접 입력 여러 개(대표님). 칩·입력을 감싸므로
          중첩 label 대신 div. */}
      <div className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
        주의사항 (여러 개 선택 가능)
        <CareMultiPicker
          name="care"
          options={CARES}
          initial={product.care ?? ""}
          customPlaceholder="주의사항 직접 입력 (예: 전자레인지 사용 불가)"
        />
      </div>
      {/* 커스텀 옵션 + 추가옵션 노출 — 상품 저장 값으로 프리필. */}
      <ProductOptionsFields
        initialOptions={product.options}
        initialAddons={product.enabledAddons}
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
        {state && (
          <p
            role="status"
            className={`text-xs ${state.ok ? "text-wabi-accent" : "text-red-700"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

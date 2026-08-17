"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProduct } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";
import { resizeFormImages } from "@/lib/resize-image";
import { OriginPicker } from "@/components/admin/origin-picker";
import { AttributePicker } from "@/components/admin/attribute-picker";
import { CareMultiPicker } from "@/components/admin/care-multi-picker";
import { ProductOptionsFields } from "@/components/admin/product-options-fields";
import { ProductImagePicker } from "@/components/admin/product-image-picker";
import { MATERIALS, CARES } from "@/lib/product-attributes";

type Category = { id: string; name_ko: string; name_en: string };

// 새 상품 등록 폼 (클라이언트) — React 19 는 서버 액션 후 폼을 자동 리셋하므로
// 입력값을 state 로 보존: 실패 시 값 유지, 성공 시에만 비운다. 결과 메시지 노출.
export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [description, setDescription] = useState("");
  // 스펙 피커(원산지·소재·사이즈·주의)·이미지 피커는 내부 상태라 성공 후 초기화하려면
  // remount(key 증가)한다 — 하나의 카운터로 함께 리셋.
  const [pickerKey, setPickerKey] = useState(0);

  // 성공 시에만 폼 초기화 (실패 시 입력값 유지). 액션 래퍼에서 처리 — effect 내 setState 회피.
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      // 업로드 전 이미지 리사이즈 — 모바일 사진 여러 장이 바디 한도를 넘기지 않게(대표님).
      await resizeFormImages(formData);
      const result = await createProduct(prev, formData);
      if (result.ok) {
        setName("");
        setPrice("");
        setStock("0");
        setCategoryId("");
        setIsMonthly(false);
        setDescription("");
        setPickerKey((k) => k + 1);
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        name="name"
        required
        aria-label="상품명"
        placeholder="상품명"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-none"
      />
      <Input
        name="price"
        type="number"
        min={0}
        required
        aria-label="가격"
        placeholder="가격"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded-none"
      />
      <Input
        name="stock"
        type="number"
        min={0}
        aria-label="재고"
        placeholder="재고"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        className="rounded-none"
      />
      <select
        name="category_id"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="border border-wabi-border bg-transparent px-3 text-sm"
      >
        <option value="">카테고리 없음</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_ko} ({c.name_en})
          </option>
        ))}
      </select>
      {/* 상세 스펙(소재·원산지·사이즈·주의) — 프리셋 드롭다운 + 직접 입력(대표님).
          비우면 상세에서 그 행 표시 생략. 넷 다 pickerKey 로 성공 후 함께 리셋. */}
      <AttributePicker
        key={`material-${pickerKey}`}
        name="material"
        label="소재"
        options={MATERIALS}
        emptyLabel="소재 선택 안 함"
        customPlaceholder="소재 직접 입력 (예: 도자기)"
      />
      {/* 원산지 — 한·일·중 드롭다운 + 직접 입력(대표님). 저장값은 완성형 문자열 */}
      <OriginPicker key={`origin-${pickerKey}`} />
      {/* 사이즈 — 프리셋 없이 직접 입력만(대표님 — 규격이 제각각). key 로 성공 후 리셋. */}
      <Input
        key={`size-${pickerKey}`}
        name="size"
        maxLength={500}
        aria-label="사이즈"
        placeholder="사이즈 (예: 지름 12cm · Ø20x12 h2.5)"
        className="rounded-none"
      />
      {/* 주의사항 — 복수 선택 + 직접 입력 여러 개(대표님). 폭이 필요해 한 줄 차지. */}
      <div className="flex flex-col gap-1 text-xs text-wabi-fg-muted sm:col-span-2 lg:col-span-4">
        주의사항 (여러 개 선택 가능)
        <CareMultiPicker
          key={`care-${pickerKey}`}
          name="care"
          options={CARES}
          customPlaceholder="주의사항 직접 입력 (예: 전자레인지 사용 불가)"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-wabi-fg-muted">
        <input
          type="checkbox"
          name="is_monthly"
          checked={isMonthly}
          onChange={(e) => setIsMonthly(e.target.checked)}
          className="size-4"
        />
        월간 그릇
      </label>
      {/* 커스텀 옵션(색상·모양 등) + 추가옵션 노출(선물 포장·쇼핑백) — 성공 후
          pickerKey 로 함께 remount 초기화. */}
      <ProductOptionsFields key={`options-${pickerKey}`} />
      {/* 상품 설명 — 상세 페이지에 노출된다. 넓게 전체 폭 차지 */}
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted sm:col-span-2 lg:col-span-4">
        상품 설명 (상세 페이지에 표시)
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="상품 설명"
          placeholder="소재·크기·사용 안내 등 상품 설명을 입력하세요"
          className="resize-y border border-wabi-border bg-transparent px-3 py-2 text-sm text-wabi-fg outline-none transition-colors focus:border-wabi-fg"
        />
      </label>
      <div className="flex flex-col gap-1 text-xs text-wabi-fg-muted sm:col-span-2 lg:col-span-3">
        상품 이미지 (여러 장 가능 · 비율·회전·필터 편집 후 자동 최적화)
        <ProductImagePicker key={`images-${pickerKey}`} name="images" />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60 sm:col-span-2 lg:col-span-1"
      >
        {pending ? "등록 중…" : "등록"}
      </Button>

      {state && (
        <p
          role="status"
          className={`sm:col-span-2 lg:col-span-4 text-xs ${state.ok ? "text-wabi-accent" : "text-red-700"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

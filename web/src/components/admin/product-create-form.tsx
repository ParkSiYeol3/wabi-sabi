"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProduct } from "@/app/admin/products/actions";
import type { ActionResult } from "@/app/admin/products/types";

type Category = { id: string; name_ko: string; name_en: string };

// 새 상품 등록 폼 (클라이언트) — React 19 는 서버 액션 후 폼을 자동 리셋하므로
// 입력값을 state 로 보존: 실패 시 값 유지, 성공 시에만 비운다. 결과 메시지 노출.
export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 성공 시에만 폼 초기화 (실패 시 입력값 유지). 액션 래퍼에서 처리 — effect 내 setState 회피.
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await createProduct(prev, formData);
      if (result.ok) {
        setName("");
        setPrice("");
        setStock("0");
        setCategoryId("");
        setIsMonthly(false);
        if (fileRef.current) fileRef.current.value = "";
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
      <label className="flex items-center gap-2 text-sm text-wabi-fg-muted">
        <input
          type="checkbox"
          name="is_monthly"
          checked={isMonthly}
          onChange={(e) => setIsMonthly(e.target.checked)}
          className="size-4"
        />
        이 달의 상품
      </label>
      <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted sm:col-span-2 lg:col-span-3">
        상품 이미지 (여러 장 가능, png/jpg/webp, 장당 최대 12MB)
        <input
          ref={fileRef}
          type="file"
          name="images"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="cursor-pointer text-sm file:mr-3 file:cursor-pointer file:border file:border-wabi-border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-wabi-fg file:transition-colors hover:file:border-wabi-fg hover:file:bg-wabi-muted"
        />
      </label>
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

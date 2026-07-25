"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addCategory } from "@/app/admin/categories/actions";
import type { ActionResult } from "@/app/admin/products/types";

type ParentOption = { id: string; name_ko: string };

// 카테고리 추가 폼 (0036, 대표님 지시) — 대분류로 만들거나 기존 대분류 아래
// 소분류로. slug 는 영문 이름에서 서버가 자동 생성한다.
export function CategoryAddForm({ parents }: { parents: ParentOption[] }) {
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState("");

  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await addCategory(prev, formData);
    if (result.ok) {
      setNameKo("");
      setNameEn("");
      setParentId("");
    }
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select
        name="parent_id"
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        aria-label="상위 분류"
        className="h-9 border border-wabi-border bg-transparent px-3 text-sm"
      >
        <option value="">대분류로 추가</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name_ko} 아래에
          </option>
        ))}
      </select>
      <Input
        name="name_ko"
        required
        maxLength={60}
        aria-label="한글 이름"
        placeholder="한글 이름 (예: 화병)"
        value={nameKo}
        onChange={(e) => setNameKo(e.target.value)}
        className="w-36"
      />
      <Input
        name="name_en"
        required
        maxLength={60}
        aria-label="영문 이름"
        placeholder="영문 이름 (예: Vase)"
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        className="w-36"
      />
      <Button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-wabi-accent px-4 hover:bg-wabi-accent/90 disabled:opacity-60"
      >
        {pending ? "추가 중…" : "추가"}
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
    </form>
  );
}

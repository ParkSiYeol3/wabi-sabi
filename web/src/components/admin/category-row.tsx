"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateCategoryName } from "@/app/admin/categories/actions";

export type CategoryRowData = {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
};

// 카테고리 이름 편집 한 줄 (#249) — 저장 시 pending + 성공/실패 메시지.
export function CategoryRow({
  cat,
  child = false,
}: {
  cat: CategoryRowData;
  child?: boolean;
}) {
  const [state, action, pending] = useActionState(updateCategoryName, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="slug" value={cat.slug} />
      <span
        className={`w-24 shrink-0 font-mono text-xs ${child ? "text-wabi-fg-muted" : "text-wabi-fg"}`}
      >
        {cat.slug}
      </span>
      <Input
        name="name_ko"
        defaultValue={cat.name_ko}
        required
        maxLength={60}
        aria-label={`${cat.slug} 한글 이름`}
        className="w-32"
      />
      <Input
        name="name_en"
        defaultValue={cat.name_en}
        required
        maxLength={60}
        aria-label={`${cat.slug} 영문 이름`}
        className="w-32"
      />
      <Button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-wabi-accent px-4 hover:bg-wabi-accent/90 disabled:opacity-60"
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
    </form>
  );
}

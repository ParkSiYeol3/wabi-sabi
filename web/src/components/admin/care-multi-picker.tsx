"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// 주의사항 복수 선택 (대표님) — 프리셋을 여러 개 토글 + 직접 입력도 여러 개 추가.
// 저장은 기존 단일 `care` 컬럼에 " · " 로 이어 붙인 문자열(상세 스펙 렌더·스키마 그대로).
// 프리셋 문구엔 " · "(공백-점-공백)가 없어 되읽기(split)가 안전하다.
const SEP = " · ";

export function CareMultiPicker({
  name,
  options,
  initial = "",
  customPlaceholder = "직접 입력",
}: {
  name: string;
  options: readonly string[];
  initial?: string;
  customPlaceholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(
    initial
      .split(SEP)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const [draft, setDraft] = useState("");

  const toggle = (v: string) =>
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const addCustom = () => {
    const v = draft.trim();
    if (!v) return;
    setSelected((s) => (s.includes(v) ? s : [...s, v]));
    setDraft("");
  };
  const remove = (v: string) => setSelected((s) => s.filter((x) => x !== v));

  // 직접 입력 항목(프리셋 아닌 것) — 아래 칩으로 따로 보여 제거 가능하게.
  const custom = selected.filter((s) => !options.includes(s));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selected.join(SEP)} />

      {/* 프리셋 — 복수 토글(여러 개 켤 수 있음) */}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              className={cn(
                "rounded border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-wabi-fg bg-wabi-fg text-white"
                  : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>

      {/* 직접 입력 — Enter 나 '추가'로 여러 개 넣기 */}
      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={200}
          aria-label="주의사항 직접 입력"
          placeholder={customPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          className="min-w-0 flex-1 border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none focus:border-wabi-fg"
        />
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex shrink-0 items-center gap-1 border border-wabi-border px-3 text-xs text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
        >
          <Plus className="size-3.5" /> 추가
        </button>
      </div>

      {/* 직접 입력한 항목 칩(제거 가능). 프리셋은 위 토글로 관리. */}
      {custom.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {custom.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded border border-wabi-fg/40 bg-wabi-muted px-2 py-0.5 text-xs text-wabi-fg"
            >
              {c}
              <button
                type="button"
                onClick={() => remove(c)}
                aria-label={`${c} 삭제`}
                className="text-wabi-fg-muted transition-colors hover:text-wabi-fg"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

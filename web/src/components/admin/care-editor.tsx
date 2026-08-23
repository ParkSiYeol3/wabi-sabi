"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveContent } from "@/app/admin/content/actions";
import type { ContentKey } from "@/lib/queries/content";
import { CARE_PRESETS } from "@/lib/care-presets";

// 사용·관리 안내 편집기(대표님) — 소제목·본문 4칸을 한데 묶고, 위에 재질 프리셋
// 버튼(세라믹·스테인리스·글라스)을 둔다. 프리셋을 누르면 두 본문이 그 재질 문안으로
// 채워지고, 매장에 맞게 다듬어 각 칸을 개별 저장한다. 항목마다 개별 저장(기존 관례).
export function CareEditor({
  usageLabelKey,
  usageLabelValue,
  usageKey,
  usageValue,
  maintainLabelKey,
  maintainLabelValue,
  maintainKey,
  maintainValue,
}: {
  usageLabelKey: ContentKey;
  usageLabelValue: string;
  usageKey: ContentKey;
  usageValue: string;
  maintainLabelKey: ContentKey;
  maintainLabelValue: string;
  maintainKey: ContentKey;
  maintainValue: string;
}) {
  const [usageLabel, setUsageLabel] = useState(usageLabelValue);
  const [usage, setUsage] = useState(usageValue);
  const [maintainLabel, setMaintainLabel] = useState(maintainLabelValue);
  const [maintain, setMaintain] = useState(maintainValue);

  return (
    <div className="space-y-4">
      {/* 재질 프리셋 — 두 본문을 채운다(소제목은 그대로 두어 대표님이 정함) */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-wabi-border p-3">
        <span className="text-xs text-wabi-fg-muted">재질 프리셋으로 채우기:</span>
        {CARE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setUsage(p.usage);
              setMaintain(p.maintain);
            }}
            className="rounded-full border border-wabi-border px-3 py-1 text-xs text-wabi-fg transition-colors hover:border-wabi-fg hover:bg-wabi-muted"
          >
            {p.label}
          </button>
        ))}
        <span className="w-full text-[11px] leading-relaxed text-wabi-fg-muted">
          버튼을 누르면 아래 본문이 채워집니다. 매장에 맞게 다듬은 뒤 <b>각 칸의
          저장</b>을 눌러 주세요. (모든 상품 상세에 공통 노출)
        </span>
      </div>

      <div className="space-y-3 rounded-lg border border-wabi-border p-4">
        <SaveField
          contentKey={usageLabelKey}
          label="첫 번째 소제목"
          hint="상세에 그대로 노출됩니다(기본 '사용')."
          value={usageLabel}
          onChange={setUsageLabel}
          singleLine
        />
        <SaveField
          contentKey={usageKey}
          label="첫 번째 본문"
          hint="한 줄에 한 항목. 위 프리셋으로 채운 뒤 다듬으세요."
          value={usage}
          onChange={setUsage}
          rows={6}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-wabi-border p-4">
        <SaveField
          contentKey={maintainLabelKey}
          label="두 번째 소제목"
          hint="상세에 그대로 노출됩니다(기본 '세척과 관리')."
          value={maintainLabel}
          onChange={setMaintainLabel}
          singleLine
        />
        <SaveField
          contentKey={maintainKey}
          label="두 번째 본문"
          hint="한 줄에 한 항목."
          value={maintain}
          onChange={setMaintain}
          rows={5}
        />
      </div>
    </div>
  );
}

// 개별 저장 칸 — 제어형 입력 + saveContent(키 단위). ContentField 와 같은 피드백.
function SaveField({
  contentKey,
  label,
  hint,
  value,
  onChange,
  rows = 3,
  singleLine = false,
}: {
  contentKey: ContentKey;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  singleLine?: boolean;
}) {
  const [state, action, pending] = useActionState(saveContent, null);
  const inputCls =
    "w-full rounded-lg border border-wabi-border bg-wabi-bg/60 p-3 text-sm leading-7 outline-none transition-colors focus:border-wabi-fg";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="key" value={contentKey} />
      <div>
        <label htmlFor={contentKey} className="block text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-1 text-xs text-wabi-fg-muted">{hint}</p>}
      </div>
      {singleLine ? (
        <input
          id={contentKey}
          name="value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          maxLength={5000}
          className={inputCls}
        />
      ) : (
        <textarea
          id={contentKey}
          name="value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required
          maxLength={5000}
          className={inputCls}
        />
      )}
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

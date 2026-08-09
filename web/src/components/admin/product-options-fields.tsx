"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ADDONS, ADDON_CODES, won } from "@/lib/addons";
import type { OptionGroup } from "@/lib/product-options";

// 상품 등록·수정 폼의 "옵션 + 추가옵션" 입력 묶음 (0048, 대표님).
//  ① 커스텀 옵션(색상·모양 등) — 그룹마다 [이름 + 값들(쉼표 구분)]. 손님이 상세에서
//     고른다. 선택만 — 가격·재고 영향 없음. hidden `options`(JSON)로 직렬화.
//  ② 추가옵션 노출 — 선물 포장·쇼핑백을 이 상품 상세에 보일지 각각 체크(개별, 대표님).
//     체크된 코드가 checkbox name="enabled_addons" 로 전송된다(formData.getAll).
//
// 등록 폼은 성공 후 부모가 key 로 remount 해 초기화한다(내부 state 라).

type Row = { name: string; values: string };

export function ProductOptionsFields({
  initialOptions = [],
  initialAddons = ADDON_CODES,
}: {
  initialOptions?: OptionGroup[];
  // 노출 켜진 애드온 코드. 수정 폼은 상품값, 등록 폼은 기본 전체.
  initialAddons?: string[];
}) {
  // 값은 편집 편의상 쉼표 구분 문자열로 다룬다(저장 시 배열로 파싱).
  const [rows, setRows] = useState<Row[]>(
    initialOptions.map((g) => ({ name: g.name, values: g.values.join(", ") })),
  );
  const [addons, setAddons] = useState<string[]>(initialAddons);

  // 직렬화 — 이름·값 트림, 빈 값·빈 그룹 제거. 서버(parseOptionGroups)가 재검증한다.
  const serialized = JSON.stringify(
    rows
      .map((r) => ({
        name: r.name.trim(),
        values: r.values
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((g) => g.name && g.values.length),
  );

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { name: "", values: "" }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));
  const toggleAddon = (code: string, on: boolean) =>
    setAddons((a) => (on ? [...new Set([...a, code])] : a.filter((c) => c !== code)));

  return (
    <div className="grid gap-4 sm:col-span-2 lg:col-span-4">
      {/* ── 커스텀 옵션 ─────────────────────────────── */}
      <div className="border border-wabi-border p-3">
        <input type="hidden" name="options" value={serialized} />
        <p className="text-xs font-medium text-wabi-fg">
          옵션{" "}
          <span className="font-normal text-wabi-fg-muted">
            (색상·모양 등 손님이 고를 선택지 · 선택만, 가격 영향 없음)
          </span>
        </p>
        <div className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                aria-label={`옵션 ${i + 1} 이름`}
                placeholder="옵션명 (예: 색상)"
                value={r.name}
                maxLength={40}
                onChange={(e) => setRow(i, { name: e.target.value })}
                className="w-36 border border-wabi-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-wabi-fg"
              />
              <input
                aria-label={`옵션 ${i + 1} 값`}
                placeholder="값 (쉼표로 구분 · 예: 그레이, 브라운)"
                value={r.values}
                onChange={(e) => setRow(i, { values: e.target.value })}
                className="min-w-0 flex-1 border border-wabi-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-wabi-fg"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={`옵션 ${i + 1} 삭제`}
                className="flex size-8 shrink-0 items-center justify-center border border-wabi-border text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 inline-flex items-center gap-1 text-xs text-wabi-fg-muted transition-colors hover:text-wabi-fg"
        >
          <Plus className="size-3.5" /> 옵션 추가
        </button>
        {rows.length === 0 && (
          <p className="mt-2 text-xs text-wabi-fg-muted">
            비워두면 옵션 없는 상품입니다.
          </p>
        )}
      </div>

      {/* ── 추가옵션 노출(선물 포장·쇼핑백 각각) ──────── */}
      <div className="border border-wabi-border p-3">
        <p className="text-xs font-medium text-wabi-fg">
          추가옵션 노출{" "}
          <span className="font-normal text-wabi-fg-muted">
            (체크한 것만 이 상품 상세에 표시)
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {ADDONS.map((a) => (
            <label
              key={a.code}
              className="flex items-center gap-2 text-sm text-wabi-fg-muted"
            >
              <input
                type="checkbox"
                name="enabled_addons"
                value={a.code}
                checked={addons.includes(a.code)}
                onChange={(e) => toggleAddon(a.code, e.target.checked)}
                className="size-4"
              />
              {a.name}{" "}
              <span className="text-xs text-wabi-fg-muted/70">
                (+{won(a.price)})
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

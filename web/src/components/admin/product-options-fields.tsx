"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ADDONS, ADDON_CODES, won } from "@/lib/addons";
import type { OptionGroup } from "@/lib/product-options";

// 상품 등록·수정 폼의 "옵션 + 추가옵션" 입력 묶음 (0048, 대표님).
//  ① 커스텀 옵션(색상·모양 등) — 그룹마다 [옵션 이름 + 선택지들(쉼표 구분)]. 손님이
//     상세에서 고른다. 선택만 — 가격·재고 영향 없음. hidden `options`(JSON)로 직렬화.
//  ② 추가옵션 노출 — 선물 포장·쇼핑백을 이 상품 상세에 보일지 각각 체크(개별, 대표님).
//
// ⚠ 대표님이 "아이보리/블루"를 각각 옵션 이름 칸에 넣고 선택지 칸을 비워 옵션이 통째로
//    저장 안 되던 사례(모바일) → 이름/선택지 칸을 위·아래로 나눠 둘 다 전폭으로 크게
//    보이게 하고, 선택지 없는 줄은 저장 전에 경고로 알린다. 등록 폼은 성공 후 부모가
//    key 로 remount 해 초기화한다(내부 state 라).

type Row = { name: string; values: string };

const splitValues = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

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
      .map((r) => ({ name: r.name.trim(), values: splitValues(r.values) }))
      .filter((g) => g.name && g.values.length),
  );

  // 이름은 있는데 선택지가 비어 "저장돼도 사라지는" 줄 — 대표님께 미리 경고.
  const incomplete = rows.filter(
    (r) => r.name.trim() && splitValues(r.values).length === 0,
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
        {/* 대표님 혼동 방지 — 이름 vs 선택지 예시를 눈에 띄게. */}
        <p className="mt-1 text-xs text-wabi-fg-muted">
          예: 옵션 이름 <b className="text-wabi-fg">색상</b> · 선택지{" "}
          <b className="text-wabi-fg">아이보리, 블루</b> (쉼표로 구분)
        </p>

        <div className="mt-3 space-y-3">
          {rows.map((r, i) => (
            <div
              key={i}
              className="space-y-2 rounded border border-wabi-border bg-wabi-bg/40 p-2.5"
            >
              {/* 1줄: 옵션 이름 + 삭제 */}
              <div className="flex items-center gap-2">
                <input
                  aria-label={`옵션 ${i + 1} 이름`}
                  placeholder="옵션 이름 (예: 색상)"
                  value={r.name}
                  maxLength={40}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  className="min-w-0 flex-1 border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none focus:border-wabi-fg"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={`옵션 ${i + 1} 삭제`}
                  className="flex size-9 shrink-0 items-center justify-center border border-wabi-border text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
                >
                  <X className="size-4" />
                </button>
              </div>
              {/* 2줄: 선택지(전폭 — 모바일에서 안 잘리게) */}
              <input
                aria-label={`옵션 ${i + 1} 선택지`}
                placeholder="선택지 — 쉼표로 구분 (예: 아이보리, 블루)"
                value={r.values}
                onChange={(e) => setRow(i, { values: e.target.value })}
                className="w-full border border-wabi-border bg-transparent px-3 py-2 text-sm outline-none focus:border-wabi-fg"
              />
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

        {incomplete.length > 0 && (
          <p className="mt-2 text-xs text-red-600">
            {incomplete.map((r) => `‘${r.name.trim()}’`).join(", ")} 에 선택지가
            없어 저장되지 않습니다. 옵션 이름은 ‘색상’, 선택지 칸에 ‘아이보리,
            블루’처럼 넣어주세요.
          </p>
        )}
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

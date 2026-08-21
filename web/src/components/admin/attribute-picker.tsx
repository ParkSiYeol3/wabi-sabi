"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

// 상품 스펙 선택 (대표님) — 프리셋 드롭다운 + "직접 입력". 원산지(OriginPicker)와
// 같은 방식을 소재·사이즈·주의사항에 재사용한다. 어느 모드든 name 컨트롤은 하나만
// 렌더 → 항상 값 하나만 제출된다. 저장값은 고른/입력한 문자열 그대로.
const CUSTOM = "__custom__";

export function AttributePicker({
  name,
  label,
  options,
  initial = "",
  emptyLabel = "선택 안 함",
  customPlaceholder = "직접 입력",
  presetAsTemplate = false,
}: {
  name: string;
  label: string;
  options: readonly string[];
  initial?: string;
  emptyLabel?: string;
  customPlaceholder?: string;
  // 프리셋을 "고정 값"이 아니라 "편집 가능한 시작값(템플릿)"으로 쓴다(사이즈 치수용).
  // 예: "Ø×" 를 고르면 입력칸에 "Ø×" 가 채워지고 대표님이 숫자를 이어 적는다.
  presetAsTemplate?: boolean;
}) {
  // 기존 값이 프리셋에 없으면(구 자유입력 등) 직접 입력 모드로 시작해 값 보존.
  const [custom, setCustom] = useState(
    initial !== "" && !options.includes(initial),
  );
  const [value, setValue] = useState(initial);

  // 모드 전환 시 새 컨트롤로 포커스 이동(키보드 접근성). 최초 마운트엔 훔치지 않음.
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userSwitched = useRef(false);
  useEffect(() => {
    if (!userSwitched.current) return;
    if (custom) inputRef.current?.focus();
    else selectRef.current?.focus();
  }, [custom]);

  if (custom) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          name={name}
          maxLength={500}
          aria-label={`${label} 직접 입력`}
          placeholder={customPlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-none"
        />
        <button
          type="button"
          onClick={() => {
            userSwitched.current = true;
            setCustom(false);
            setValue("");
          }}
          className="shrink-0 cursor-pointer text-xs text-wabi-fg-muted underline underline-offset-2 transition-colors hover:text-wabi-fg"
        >
          목록
        </button>
      </div>
    );
  }

  return (
    <select
      ref={selectRef}
      name={name}
      aria-label={label}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === CUSTOM) {
          userSwitched.current = true;
          setCustom(true);
          setValue("");
        } else if (presetAsTemplate && v !== "") {
          // 프리셋을 편집 가능한 시작값으로 — 입력 모드로 전환해 값(치수 형식)을 채운다.
          userSwitched.current = true;
          setCustom(true);
          setValue(v);
        } else {
          setValue(v);
        }
      }}
      className="h-9 w-full border border-wabi-border bg-transparent px-3 text-sm"
    >
      <option value="">{emptyLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value={CUSTOM}>직접 입력…</option>
    </select>
  );
}

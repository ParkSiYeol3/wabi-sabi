"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { ORIGINS, isKnownOrigin, originLabel } from "@/lib/origins";

// 원산지 선택 (대표님) — 한·일·중은 드롭다운, 그 외는 "직접 입력".
// 어느 모드든 name="origin" 컨트롤은 하나만 렌더 → 항상 origin 하나만 제출된다.
// 저장값은 완성형 문자열이라 상세 스펙 렌더는 값 그대로 쓴다.
const CUSTOM = "__custom__";

export function OriginPicker({ initial = "" }: { initial?: string }) {
  // 기존 값이 프리셋에 없으면(구 자유입력 등) 직접 입력 모드로 시작해 값 보존.
  const [custom, setCustom] = useState(initial !== "" && !isKnownOrigin(initial));
  const [value, setValue] = useState(initial);

  // 모드 전환 시 언마운트된 컨트롤에서 포커스가 사라지지 않게 새 컨트롤로 옮긴다
  // (키보드 접근성, CodeRabbit). 최초 마운트에선 포커스를 훔치지 않는다.
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
          name="origin"
          maxLength={120}
          aria-label="원산지 직접 입력"
          placeholder="직접 입력 (예: Made in Korea)"
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
      name="origin"
      aria-label="원산지"
      value={value}
      onChange={(e) => {
        if (e.target.value === CUSTOM) {
          userSwitched.current = true;
          setCustom(true);
          setValue("");
        } else {
          setValue(e.target.value);
        }
      }}
      className="h-9 w-full border border-wabi-border bg-transparent px-3 text-sm"
    >
      <option value="">원산지 선택 안 함</option>
      {ORIGINS.map((o) => (
        <option key={o.value} value={o.value}>
          {originLabel(o)}
        </option>
      ))}
      <option value={CUSTOM}>직접 입력…</option>
    </select>
  );
}

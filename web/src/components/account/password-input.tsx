"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { hangulToQwerty, hasHangul } from "@/lib/hangul-keys";

// 비밀번호 칸 — 한글 자판 상태로 쳐도 영문 글자로 바꿔 넣는다(#863, 시열님 제보:
// 맞게 쳤는데 한글 상태라 틀렸다고 나옴). 조합 중인 글자는 건드리지 않고(자판이
// 꼬인다) 글자가 확정된 뒤에 바꾼다.
export function PasswordInput({
  onInput,
  onCompositionEnd,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [converted, setConverted] = useState(false);

  function toQwerty(el: HTMLInputElement) {
    const v = el.value;
    if (!hasHangul(v)) return;
    const caret = el.selectionStart ?? v.length;
    el.value = hangulToQwerty(v);
    const pos = hangulToQwerty(v.slice(0, caret)).length;
    el.setSelectionRange(pos, pos);
    setConverted(true);
  }

  return (
    <>
      <Input
        {...props}
        type="password"
        lang="en"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onInput={(e) => {
          if (!(e.nativeEvent as InputEvent).isComposing) toQwerty(e.currentTarget);
          onInput?.(e);
        }}
        onCompositionEnd={(e) => {
          toQwerty(e.currentTarget);
          onCompositionEnd?.(e);
        }}
      />
      {converted && (
        <p role="status" className="mt-1 text-xs text-wabi-fg-muted">
          한글 자판으로 입력된 글자를 영문으로 바꿨어요.
        </p>
      )}
    </>
  );
}

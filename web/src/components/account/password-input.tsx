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
  // 한글 입력 상태 경고 — 한글을 바꿔 넣으면 켜고, 영문을 치기 시작하거나 칸을 비우면 끈다.
  const [hangulMode, setHangulMode] = useState(false);

  function toQwerty(el: HTMLInputElement) {
    const v = el.value;
    if (!hasHangul(v)) return false;
    const caret = el.selectionStart ?? v.length;
    el.value = hangulToQwerty(v);
    const pos = hangulToQwerty(v.slice(0, caret)).length;
    el.setSelectionRange(pos, pos);
    setHangulMode(true);
    return true;
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
          const ne = e.nativeEvent as InputEvent;
          if (!ne.isComposing && !toQwerty(e.currentTarget)) {
            if (!e.currentTarget.value || (ne.data && /^[\x20-\x7e]+$/.test(ne.data))) {
              setHangulMode(false);
            }
          }
          onInput?.(e);
        }}
        onCompositionEnd={(e) => {
          toQwerty(e.currentTarget);
          onCompositionEnd?.(e);
        }}
      />
      {/* 꼭 알아야 하는 안내라 오류와 같은 빨간 글씨(시열님) */}
      {hangulMode && (
        <p role="status" className="mt-1 break-keep text-xs leading-5 text-red-700">
          한글 입력 상태입니다. 영문으로 전환해 주세요. 이미 입력한 글자는 영문으로
          바꿨습니다.
        </p>
      )}
    </>
  );
}

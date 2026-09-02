"use client";

import { useLayoutEffect, useRef } from "react";

// 입력 내용에 맞춰 높이가 자동으로 늘어나는 textarea(대표님 — 모바일에선 우하단
// resize 손잡이를 터치로 잡기 어려워 칸 조절이 안 됐음). 타이핑할수록 스스로
// 커지므로 손잡이 없이도 긴 설명을 편히 쓴다. min-height 는 className 으로 준
// 값이 바닥(floor)이 되고 그 이상은 내용만큼 확장된다. 데스크톱 드래그 조절도
// resize 클래스로 그대로 유지 가능.
export function AutoGrowTextarea(
  props: React.ComponentPropsWithoutRef<"textarea">,
) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // 첫 렌더(기존 설명 로드 등) 시 내용 높이에 맞춘다. 스타일 직접 조작이라
  // 상태 변경이 없다(리렌더 유발 안 함). 마운트 1회만 실행.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <textarea
      ref={ref}
      {...props}
      onInput={(e) => {
        grow();
        props.onInput?.(e);
      }}
    />
  );
}

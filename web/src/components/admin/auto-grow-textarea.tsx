"use client";

import { useLayoutEffect, useRef } from "react";

// 입력 내용에 맞춰 높이가 자동으로 늘어나는 textarea(대표님 — 모바일에선 우하단
// resize 손잡이를 터치로 잡기 어려워 칸 조절이 안 됐음). 타이핑할수록 스스로
// 커지므로 손잡이 없이도 긴 설명을 편히 쓴다. min-height 는 className 으로 준
// 값이 바닥(floor)이 되고 그 이상은 내용만큼 확장된다. 데스크톱 드래그 조절도
// resize 클래스로 그대로 유지 가능.
//
// ref 는 밖으로 전달한다(React 19 ref-as-prop) — AttributePicker 가 모드 전환 시
// 포커스를 옮기는 데 쓴다. 내부 높이 계산용 ref 와 함께 물린다.
export function AutoGrowTextarea({
  ref: outer,
  ...props
}: React.ComponentPropsWithoutRef<"textarea"> & {
  ref?: React.Ref<HTMLTextAreaElement>;
}) {
  const inner = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // 첫 렌더(기존 설명 로드 등) 시 내용 높이에 맞춘다. 스타일 직접 조작이라
  // 상태 변경이 없다(리렌더 유발 안 함). 마운트 1회만 실행.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // 제어 컴포넌트로 쓰일 때(value prop) 값이 밖에서 바뀌면 onInput 이 안 도니
  // 여기서 높이를 맞춘다. 프리셋 템플릿 주입(사이즈)처럼 값이 코드로 꽂히는 경우.
  useLayoutEffect(grow, [props.value]);

  return (
    <textarea
      ref={(el) => {
        inner.current = el;
        if (typeof outer === "function") outer(el);
        else if (outer) outer.current = el;
      }}
      {...props}
      onInput={(e) => {
        grow();
        props.onInput?.(e);
      }}
    />
  );
}

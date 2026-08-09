"use client";

import type { VariantProps } from "class-variance-authority";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// 서버 액션 폼의 제출 버튼 — 제출 중이면 pendingText 로 바뀌고 비활성화된다.
// useFormStatus 는 부모 <form> 의 대기 상태를 읽으므로, useActionState 없이
// 바로 서버 액션을 바인딩한 폼에도 붙이면 로딩 피드백이 생긴다(대표님 요청).
//
// styled=false(기본): 순수 <button> — 인라인 텍스트 버튼(저장/삭제 링크)용.
// styled=true: Button 프리미티브와 같은 스타일(variant/size) — 주요 액션 버튼용.
type Props = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    pendingText: string;
    styled?: boolean;
  };

export function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  styled = false,
  variant,
  size,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={
        styled
          ? cn(buttonVariants({ variant, size }), className)
          : cn("disabled:cursor-default disabled:opacity-60", className)
      }
      {...rest}
    >
      {pending ? pendingText : children}
    </button>
  );
}

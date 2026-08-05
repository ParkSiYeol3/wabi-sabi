"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";

// 모바일 "분류" 드롭다운(대표님). details/summary 는 JS 없이 열고 닫히지만,
// 안의 링크는 next/link 클라이언트 내비라 페이지만 바뀌고 드롭다운은 열린 채
// 남아 결과를 가린다. 그래서 목록의 링크를 누르면 details 를 닫아, 고른 분류의
// 상품이 바로 눈앞에 보이게 한다(대표님). 클릭 위임 — 내부 <a> 클릭 시 open=false.
export function MobileCategoryDropdown({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={ref} className="group mt-8 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between border border-wabi-border px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-wabi-fg-muted">분류</span>
          <span className="mx-2 text-wabi-border">·</span>
          {label}
        </span>
        <ChevronDown className="size-4 shrink-0 text-wabi-fg-muted transition-transform group-open:rotate-180" />
      </summary>
      <div
        className="mt-2 border border-wabi-border p-4"
        onClick={(e) => {
          // 목록의 링크를 누르면 드롭다운을 닫는다(결과가 바로 보이게).
          if ((e.target as HTMLElement).closest("a") && ref.current) {
            ref.current.open = false;
          }
        }}
      >
        {children}
      </div>
    </details>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

// 정렬 드롭다운(대표님 — 텍스트 링크 대신 셀렉트). 선택지마다 이동할 주소(href)를 서버가
// 미리 만들어 넘긴다: 현재 필터(카테고리·검색어 등)는 그대로, 정렬만 바뀐 주소. /shop·/search 공용.
// 네이티브 셀렉트의 넓은 여백·이중 화살표 대신 appearance-none + 커스텀 아래 화살표 하나로
// 폭을 내용에 맞춘다(대표님).
export function SortSelect({
  value,
  options,
}: {
  value: string;
  options: { key: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        aria-label="정렬"
        onChange={(e) => {
          const next = options.find((o) => o.key === e.target.value);
          if (next) router.push(next.href);
        }}
        className="cursor-pointer appearance-none rounded-md border border-wabi-border bg-wabi-bg/60 py-1.5 pl-3 pr-7 text-xs text-wabi-fg outline-none transition-colors focus:border-wabi-fg"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 size-3.5 text-wabi-fg-muted"
        strokeWidth={1.8}
        aria-hidden
      />
    </div>
  );
}

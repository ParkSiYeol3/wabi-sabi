"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import type { ProductSort } from "@/lib/queries/products";

// 정렬 드롭다운(대표님 — 텍스트 링크 대신 셀렉트). 선택 시 현재 필터(카테고리·검색)를
// 유지한 채 sort 파라미터만 바꿔 이동한다. 네이티브 셀렉트의 넓은 여백·이중 화살표
// 대신 appearance-none + 커스텀 아래 화살표 하나로 폭을 내용에 맞춘다(대표님).
export function SortSelect({
  sp,
  sort,
  options,
}: {
  sp: ShopSP;
  sort: ProductSort;
  options: { key: ProductSort; label: string }[];
}) {
  const router = useRouter();
  return (
    <div className="relative inline-flex items-center">
      <select
        value={sort}
        aria-label="정렬"
        onChange={(e) =>
          router.push(buildShopQuery(sp, { sort: e.target.value as ProductSort }))
        }
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

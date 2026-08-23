"use client";

import { useRouter } from "next/navigation";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";
import type { ProductSort } from "@/lib/queries/products";

// 정렬 드롭다운(대표님 — 텍스트 링크 대신 셀렉트). 선택 시 현재 필터(카테고리·검색)를
// 유지한 채 sort 파라미터만 바꿔 이동한다.
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
    <label className="inline-flex items-center gap-2 text-xs text-wabi-fg-muted">
      <span className="sr-only">정렬</span>
      <select
        value={sort}
        onChange={(e) =>
          router.push(buildShopQuery(sp, { sort: e.target.value as ProductSort }))
        }
        className="cursor-pointer rounded-md border border-wabi-border bg-wabi-bg/60 py-1.5 pl-3 pr-7 text-xs text-wabi-fg outline-none transition-colors focus:border-wabi-fg"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

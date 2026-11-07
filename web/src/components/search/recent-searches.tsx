"use client";

import Link from "next/link";
import { X } from "lucide-react";
import {
  clearRecentSearches,
  removeRecentSearch,
  useRecentSearches,
} from "@/lib/recent-searches";

// 최근 검색어(이 기기에만 저장). 없으면 칸 자체를 그리지 않는다.
export function RecentSearches() {
  const list = useRecentSearches();
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="recent-searches">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-searches" className="text-sm font-medium text-wabi-fg">
          최근 검색어
        </h2>
        <button
          type="button"
          onClick={clearRecentSearches}
          className="h-8 px-1 text-xs text-wabi-fg-muted underline underline-offset-2 transition-colors hover:text-wabi-fg"
        >
          전체 삭제
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {list.map((q) => (
          <li
            key={q}
            className="inline-flex h-9 max-w-full items-center rounded-full border border-wabi-border pl-3.5 text-sm text-wabi-fg"
          >
            <Link
              href={`/search?q=${encodeURIComponent(q)}`}
              className="min-w-0 truncate transition-opacity hover:opacity-70"
            >
              {q}
            </Link>
            <button
              type="button"
              aria-label={`'${q}' 지우기`}
              onClick={() => removeRecentSearch(q)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-wabi-fg-muted transition-colors hover:text-wabi-fg"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

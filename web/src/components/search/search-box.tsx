"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, ImageIcon, Search, X } from "lucide-react";
import { Price } from "@/components/product/price";
import {
  MAX_QUERY_LENGTH,
  prepareFields,
  scoreProduct,
  tokenize,
  type SearchFields,
} from "@/lib/search";
import { addRecentSearch, useRecentSearches } from "@/lib/recent-searches";
import { cn } from "@/lib/utils";

// 검색 입력 + 자동완성(대표님 2026-11-08: 쇼핑몰처럼). 치는 동안 맞는 상품을 사진·가격과
// 함께 바로 아래에 보여 주고, 누르면 상세로 간다. 검색 규칙은 결과 화면과 같은 lib/search.
// 상품이 수십 개라 목록 전체를 받아 브라우저에서 거른다(입력마다 서버 왕복 없음).

export type SuggestItem = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  soldOut: boolean;
  fields: SearchFields;
};

const MAX_SUGGESTIONS = 6;

export function SearchBox({
  initialQuery,
  items,
  autoFocus,
}: {
  initialQuery: string;
  items: SuggestItem[];
  autoFocus: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // 결과 화면에 들어온 검색어는 최근 검색어로(추천어·최근 검색어 칩·주소로 들어와도 같게).
  useEffect(() => {
    if (initialQuery) addRecentSearch(initialQuery);
  }, [initialQuery]);

  const prepared = useMemo(
    () => items.map((it) => ({ it, f: prepareFields(it.fields) })),
    [items],
  );

  const suggestions = useMemo(() => {
    const tokens = tokenize(text);
    if (tokens.length === 0) return [];
    return prepared
      .map(({ it, f }) => ({ it, s: scoreProduct(f, tokens, { typing: true }) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => Number(a.it.soldOut) - Number(b.it.soldOut) || b.s - a.s)
      .slice(0, MAX_SUGGESTIONS)
      .map((r) => r.it);
  }, [prepared, text]);

  const trimmed = text.trim();
  // 결과 화면에서 입력칸을 비우면 최근 검색어를 띄운다(쇼핑몰처럼, 11/08 점검). 지금 검색어는
  // 이미 화면에 있으니 뺀다. 검색어 없는 첫 화면은 아래에 최근 검색어가 따로 있어 띄우지 않는다.
  const allRecent = useRecentSearches();
  const recent = useMemo(
    () => allRecent.filter((q) => q !== initialQuery),
    [allRecent, initialQuery],
  );
  const recentMode = open && trimmed === "" && initialQuery !== "" && recent.length > 0;
  const suggestMode = open && trimmed !== "" && trimmed !== initialQuery;
  const showList = recentMode || suggestMode;
  // 자동완성은 마지막 줄 = "'검색어' 전체 결과 보기"
  const optionCount = recentMode ? recent.length : suggestMode ? suggestions.length + 1 : 0;

  const go = (href: string) => {
    setOpen(false);
    inputRef.current?.blur(); // 휴대폰 키보드 내리기
    startTransition(() => router.push(href));
  };

  const submit = () => {
    const q = trimmed.slice(0, MAX_QUERY_LENGTH);
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    go(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter·화살표는 IME 몫
    if (e.key === "ArrowDown" && optionCount) {
      e.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === "ArrowUp" && optionCount) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && recentMode && active >= 0) {
      e.preventDefault();
      go(`/search?q=${encodeURIComponent(recent[active])}`);
    } else if (e.key === "Enter" && suggestMode && active >= 0 && active < suggestions.length) {
      e.preventDefault();
      go(`/shop/${suggestions[active].id}`);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <form
      role="search"
      action="/search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative"
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b-2 pb-1.5 transition-colors",
          open ? "border-wabi-fg" : "border-wabi-fg/70",
        )}
      >
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          maxLength={MAX_QUERY_LENGTH}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="찾는 기물을 입력해 주세요"
          aria-label="상품 검색"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-wabi-fg outline-none placeholder:text-wabi-fg-muted/70 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label="검색어 지우기"
            // 누르는 순간 입력칸 포커스가 빠지지 않게(목록이 닫혔다 열리며 깜빡이는 것 방지)
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setText("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-wabi-fg-muted transition-colors hover:text-wabi-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        <button
          type="submit"
          aria-label="검색"
          className="flex size-10 shrink-0 items-center justify-center text-wabi-fg transition-opacity hover:opacity-70"
        >
          <Search
            className={cn("size-5", pending && "animate-pulse")}
            strokeWidth={1.6}
            aria-hidden
          />
        </button>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={recentMode ? "최근 검색어" : "검색어 자동완성"}
        hidden={!showList}
        // 목록을 누르는 동안 입력칸이 blur 돼 목록이 먼저 닫히지 않게
        onMouseDown={(e) => e.preventDefault()}
        className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(28rem,60vh)] overflow-y-auto rounded-lg border border-wabi-border bg-wabi-bg py-1 shadow-lg"
      >
        {recentMode &&
          recent.map((q, i) => (
            <li key={q} id={optionId(i)} role="option" aria-selected={active === i}>
              <Link
                href={`/search?q=${encodeURIComponent(q)}`}
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  go(`/search?q=${encodeURIComponent(q)}`);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm text-wabi-fg",
                  active === i && "bg-wabi-muted/70",
                )}
              >
                <Clock className="size-4 shrink-0 text-wabi-fg-muted" strokeWidth={1.6} aria-hidden />
                <span className="min-w-0 truncate">{q}</span>
              </Link>
            </li>
          ))}
        {suggestMode &&
          suggestions.map((it, i) => (
          <li
            key={it.id}
            id={optionId(i)}
            role="option"
            aria-selected={active === i}
          >
            <Link
              href={`/shop/${it.id}`}
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                go(`/shop/${it.id}`);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex items-center gap-3 px-3 py-2",
                active === i && "bg-wabi-muted/70",
              )}
            >
              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-wabi-muted">
                {it.image ? (
                  <Image
                    src={it.image}
                    alt=""
                    fill
                    sizes="44px"
                    className={cn("object-cover", it.soldOut && "opacity-50")}
                  />
                ) : (
                  <ImageIcon className="size-4 text-wabi-fg-muted/40" strokeWidth={1} aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm",
                    it.soldOut ? "text-wabi-fg-muted" : "text-wabi-fg",
                  )}
                >
                  {it.name}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-xs">
                  <Price value={it.price} className="text-wabi-fg" />
                  {it.soldOut && <span className="text-wabi-fg-muted">품절</span>}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {suggestMode && (
          <li
            id={optionId(suggestions.length)}
            role="option"
            aria-selected={active === suggestions.length}
            className={cn(suggestions.length > 0 && "mt-1 border-t border-wabi-border pt-1")}
          >
            <button
              type="submit"
              tabIndex={-1}
              onMouseEnter={() => setActive(suggestions.length)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-wabi-fg-muted",
                active === suggestions.length && "bg-wabi-muted/70 text-wabi-fg",
              )}
            >
              <span className="min-w-0 truncate">
                {suggestions.length === 0 ? "맞는 상품이 없습니다. " : ""}
                <span className="text-wabi-fg">&lsquo;{trimmed}&rsquo;</span> 전체 결과 보기
              </span>
              <ArrowRight className="size-4 shrink-0" strokeWidth={1.6} aria-hidden />
            </button>
          </li>
        )}
      </ul>
    </form>
  );
}

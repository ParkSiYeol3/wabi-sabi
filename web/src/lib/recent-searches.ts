import { useSyncExternalStore } from "react";
import { MAX_QUERY_LENGTH } from "@/lib/search";

// 최근 검색어(2026-11-08). 이 기기 브라우저에만 저장한다(서버·DB 로 보내지 않음).
// 개인정보 화면에서 지울 수 있게 하나씩·전체 삭제를 둔다. 저장소가 막힌 브라우저(사생활
// 보호 창 등)에서는 조용히 비어 있는 것으로 동작한다.

const KEY = "wasa:recent-searches";
const CHANGE = "wasa:recent-searches-change";
const MAX = 10;
const EMPTY: string[] = [];

// useSyncExternalStore 는 같은 값이면 같은 참조를 돌려받아야 한다 → 원문 문자열로 캐시.
let cachedRaw: string | null | undefined;
let cachedList: string[] = EMPTY;

function read(): string[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    cachedList = Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, MAX)
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function write(list: string[]) {
  try {
    if (list.length) window.localStorage.setItem(KEY, JSON.stringify(list));
    else window.localStorage.removeItem(KEY);
  } catch {
    // 저장 불가(사생활 보호 등): 기록 없이 넘어간다.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // 다른 탭
  window.addEventListener(CHANGE, onChange); // 같은 탭
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addRecentSearch(q: string) {
  const t = q.trim().slice(0, MAX_QUERY_LENGTH);
  if (!t) return;
  write([t, ...read().filter((x) => x !== t)].slice(0, MAX));
}

export function removeRecentSearch(q: string) {
  write(read().filter((x) => x !== q));
}

export function clearRecentSearches() {
  write([]);
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, X } from "lucide-react";
import { adminAction, SectionHeading } from "@/components/admin/ui";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_CHOICES,
  SHORTCUT_MAX,
} from "@/lib/admin-shortcuts";
import { saveMyShortcuts } from "@/app/admin/shortcuts";

// 대시보드 바로가기(대표님 — 사이드바 드로어를 열지 않고 대시보드에서 한 번에 이동).
// 북마크처럼 계정마다 고른다(0084, 시열님 2026-10-22): '편집'에서 사이드바 메뉴 중
// 최대 8개를 고르고 순서를 바꾼다. 저장은 DB 라 휴대폰·컴퓨터에서 같다.
// 라벨·아이콘은 사이드바 nav 재사용. 휴대폰은 4칸씩(마지막 줄 가운데), 컴퓨터는 한 줄.
const byHref = new Map(SHORTCUT_CHOICES.map((it) => [it.href, it]));

export function QuickActions({ initial }: { initial: string[] }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = saved.map((h) => byHref.get(h)).filter((it) => !!it);

  if (!draft) {
    return (
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading>바로가기</SectionHeading>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDraft(saved);
            }}
            className="inline-flex h-9 items-center gap-1 px-2 text-xs text-wabi-fg-muted transition-colors hover:text-wabi-fg"
          >
            <Pencil className="size-3.5" aria-hidden />
            편집
          </button>
        </div>
        {items.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-wabi-border p-4 text-center text-sm text-wabi-fg-muted">
            바로가기가 없습니다. 편집에서 자주 가는 메뉴를 골라 주세요.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className="flex basis-[calc((100%-1.875rem)/4)] flex-col items-center justify-center gap-2 rounded-xl border border-wabi-border bg-wabi-bg/40 px-1 py-4 text-center shadow-sm transition active:scale-95 hover:border-wabi-fg hover:bg-wabi-muted/50 sm:basis-[calc((100%-5.25rem)/8)]"
                >
                  <Icon className="size-6 text-wabi-fg" strokeWidth={1.6} aria-hidden />
                  <span className="text-xs font-medium leading-tight text-wabi-fg">
                    {it.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  const full = draft.length >= SHORTCUT_MAX;
  const rest = SHORTCUT_CHOICES.filter((it) => !draft.includes(it.href));
  const move = (i: number, d: -1 | 1) => {
    const next = [...draft];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setDraft(next);
  };

  return (
    <section className="rounded-xl border border-wabi-border bg-wabi-bg/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <SectionHeading>바로가기 편집</SectionHeading>
        <span className="font-numeric text-xs text-wabi-fg-muted lining-nums tabular-nums">
          {draft.length}/{SHORTCUT_MAX}
        </span>
      </div>

      {draft.length === 0 ? (
        <p className="mt-3 text-sm text-wabi-fg-muted">고른 메뉴가 없습니다. 아래에서 더해 주세요.</p>
      ) : (
        <ol className="mt-3 divide-y divide-wabi-border rounded-lg border border-wabi-border">
          {draft.map((h, i) => {
            const it = byHref.get(h);
            if (!it) return null;
            const Icon = it.icon;
            return (
              <li key={h} className="flex items-center gap-2 py-1 pl-3 pr-1">
                <Icon className="size-4 shrink-0 text-wabi-fg" strokeWidth={1.6} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-wabi-fg">{it.label}</span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`${it.label} 앞으로`}
                  className="flex size-9 items-center justify-center rounded-md text-wabi-fg-muted transition-colors hover:text-wabi-fg disabled:opacity-30"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === draft.length - 1}
                  aria-label={`${it.label} 뒤로`}
                  className="flex size-9 items-center justify-center rounded-md text-wabi-fg-muted transition-colors hover:text-wabi-fg disabled:opacity-30"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(draft.filter((x) => x !== h))}
                  aria-label={`${it.label} 빼기`}
                  className="flex size-9 items-center justify-center rounded-md text-wabi-fg-muted transition-colors hover:text-red-700"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {rest.length > 0 && (
        <div className="mt-4">
          <p className="break-keep text-xs text-wabi-fg-muted">
            {full ? `최대 ${SHORTCUT_MAX}개입니다. 하나를 빼면 더할 수 있습니다.` : "더할 메뉴"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {rest.map((it) => (
              <button
                key={it.href}
                type="button"
                disabled={full}
                onClick={() => setDraft([...draft, it.href])}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-wabi-border px-3 text-sm text-wabi-fg transition hover:border-wabi-fg disabled:opacity-40"
              >
                <Plus className="size-3.5" aria-hidden />
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_SHORTCUTS)}
          className="h-9 px-1 text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
        >
          기본값으로
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft(null)}
            disabled={pending}
            className={adminAction({ tone: "outline" })}
          >
            취소
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveMyShortcuts(draft);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setSaved(res.shortcuts);
                setDraft(null);
              })
            }
            className={adminAction({ tone: "solid" })}
          >
            {pending ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}

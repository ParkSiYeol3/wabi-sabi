"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { MomentProductTag } from "@/lib/queries/moments";
import { MAX_PRODUCT_TAGS } from "@/lib/moment-products";

// 사진 속 기물(상품) 고르기(#664) — 글 작성 폼과 어드민 태그 편집이 같이 쓴다.
// 고른 상품은 hidden input(name)으로 폼에 실린다. 순서 = 고른 순서(태그 표시 순서).
// 목록은 접어 두고 "기물 태그하기"로 연다 — 태그는 선택이라 폼을 길게 만들지 않는다.
export function ProductTagPicker({
  products,
  defaultSelected = [],
  name = "product_id",
}: {
  products: MomentProductTag[];
  defaultSelected?: string[];
  name?: string;
}) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const [selected, setSelected] = useState<string[]>(
    defaultSelected.filter((id) => byId.has(id)),
  );
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const full = selected.length >= MAX_PRODUCT_TAGS;
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? products.filter((p) => p.name.toLowerCase().includes(needle))
    : products;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_PRODUCT_TAGS
          ? prev
          : [...prev, id],
    );
  }

  return (
    <div className="space-y-2">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((id) => (
          <span
            key={id}
            className="inline-flex max-w-full items-center gap-1 border border-wabi-fg/60 py-1 pl-2 pr-1 text-xs text-wabi-fg"
          >
            <span className="truncate">{byId.get(id)?.name}</span>
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-label={`${byId.get(id)?.name} 태그 빼기`}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center text-wabi-fg-muted transition-colors hover:text-wabi-fg"
            >
              <X className="size-3.5" strokeWidth={1.75} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1 border border-dashed border-wabi-border px-2.5 py-1 text-xs text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
          {open ? "목록 닫기" : "사용한 기물 태그하기"}
        </button>
        <span className="font-numeric text-xs text-wabi-fg-muted">
          {selected.length}/{MAX_PRODUCT_TAGS}
        </span>
      </div>

      {open && (
        <div className="border border-wabi-border bg-wabi-bg">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            placeholder="상품 이름으로 찾기"
            aria-label="상품 이름으로 찾기"
            className="w-full border-b border-wabi-border bg-transparent px-3 py-2 text-base outline-none md:text-sm"
          />
          <ul className="max-h-60 overflow-y-auto">
            {visible.length === 0 ? (
              <li className="px-3 py-3 text-xs text-wabi-fg-muted">
                찾는 상품이 없습니다.
              </li>
            ) : (
              visible.map((p) => {
                const on = selected.includes(p.id);
                const disabled = !on && full;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={disabled}
                      aria-pressed={on}
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-wabi-subtle/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="relative size-9 shrink-0 overflow-hidden bg-wabi-muted">
                        {p.image && (
                          <Image
                            src={p.image}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center border ${
                          on
                            ? "border-wabi-fg bg-wabi-fg text-wabi-bg"
                            : "border-wabi-border"
                        }`}
                      >
                        {on && <Check className="size-3.5" strokeWidth={2} />}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {full && (
            <p className="border-t border-wabi-border px-3 py-2 text-xs text-wabi-fg-muted">
              최대 {MAX_PRODUCT_TAGS}개까지 고를 수 있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

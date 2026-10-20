"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { CHAT_MAX } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

// 메시지 입력칸(#881). Enter 로 보내고 Shift+Enter 는 줄바꿈. 한글은 조합 중 Enter 가
// 글자 확정이라 그때는 보내지 않는다(isComposing). 보내는 동안엔 잠근다.
export function ChatComposer({
  onSend,
  placeholder = "메시지를 입력해 주세요",
  autoFocus,
  textareaRef,
}: {
  onSend: (text: string) => Promise<boolean>;
  placeholder?: string;
  autoFocus?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const own = useRef<HTMLTextAreaElement>(null);
  const inner = textareaRef ?? own;

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const ok = await onSend(value);
    setSending(false);
    if (ok) {
      setText("");
      if (inner.current) {
        inner.current.style.height = "auto";
        inner.current.focus();
      }
    }
  }

  const over = text.length > CHAT_MAX;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-1"
    >
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="chat-input">
          메시지
        </label>
        <textarea
          id="chat-input"
          ref={inner}
          rows={1}
          value={text}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          className="min-h-10 flex-1 resize-none border border-wabi-border bg-wabi-bg px-3 py-2 text-base leading-6 text-wabi-fg outline-none placeholder:text-wabi-fg-muted focus-visible:border-wabi-fg md:text-sm"
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || over}
          aria-label="보내기"
          className="flex h-10 w-10 shrink-0 items-center justify-center bg-wabi-accent text-white transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {text.length > CHAT_MAX - 200 && (
        <p
          aria-live="polite"
          className={cn(
            "text-right font-numeric text-[11px]",
            over ? "text-red-700" : "text-wabi-fg-muted",
          )}
        >
          {text.length.toLocaleString()}/{CHAT_MAX.toLocaleString()}자
        </p>
      )}
    </form>
  );
}

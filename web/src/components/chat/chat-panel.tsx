"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { site } from "@/lib/site";
import type { ChatMessage } from "@/lib/chat-types";
import { MessageList } from "./message-list";
import { ChatComposer } from "./chat-composer";

// 채팅 상담 대화 창(#881). 휴대폰은 화면 전체, 컴퓨터는 오른쪽 아래 작은 창.
export function ChatPanel({
  messages,
  member,
  hasThread,
  guestEmail,
  error,
  onSend,
  onClose,
}: {
  messages: ChatMessage[];
  member: boolean;
  hasThread: boolean;
  guestEmail: string | null;
  error: string | null;
  onSend: (text: string, email?: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const askEmail = !member && !guestEmail;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 컴퓨터에선 바로 입력할 수 있게 포커스. 휴대폰은 키보드가 화면을 덮어 누를 때만.
  // 휴대폰에선 창이 화면 전체라 뒤 페이지가 같이 스크롤되지 않게 잠근다.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) {
      input.current?.focus();
      return;
    }
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  const intro = (
    <div className="mb-3">
      <p className="mb-1 text-[11px] text-wabi-fg-muted">와비사비</p>
      <p className="max-w-[85%] whitespace-pre-line break-keep rounded-2xl rounded-bl-sm border border-wabi-border bg-wabi-bg px-3 py-2 text-sm leading-6 text-wabi-fg">
        {`안녕하세요, 와비사비입니다.\n궁금한 점을 남겨 주시면 영업시간에 순서대로 답해 드리겠습니다.`}
        {!member && !hasThread && "\n창을 닫으셔도 대화는 이 브라우저에 남습니다."}
      </p>
    </div>
  );

  return (
    <section
      role="dialog"
      aria-labelledby="chat-title"
      className="fixed inset-0 z-[55] flex flex-col bg-wabi-bg md:inset-auto md:bottom-6 md:right-6 md:h-[min(36rem,calc(100dvh-3rem))] md:w-[22.5rem] md:border md:border-wabi-border md:shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
    >
      <header
        className="flex items-start justify-between gap-3 border-b border-wabi-border bg-wabi-subtle/60 px-4 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="min-w-0">
          <h2 id="chat-title" className="text-sm font-medium text-wabi-fg">
            채팅 상담
          </h2>
          <p className="mt-0.5 break-keep font-numeric text-[11px] text-wabi-fg-muted">
            영업시간 {site.hours}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="채팅 닫기"
          className="-mr-2 -mt-1 p-2 text-wabi-fg-muted transition-colors hover:text-wabi-fg"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <MessageList
        className="min-h-0 flex-1"
        messages={messages}
        mine="customer"
        theirLabel="와비사비"
        intro={intro}
      />

      <div
        className="border-t border-wabi-border px-3 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {askEmail && (
          <div className="mb-2">
            <label htmlFor="chat-email" className="block text-[11px] text-wabi-fg-muted">
              연락받을 이메일 (선택)
            </label>
            <input
              id="chat-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="창을 닫으셔도 이메일로 답을 드릴 수 있습니다"
              className="mt-1 h-9 w-full border border-wabi-border bg-wabi-bg px-3 font-numeric text-base text-wabi-fg outline-none placeholder:text-[12px] placeholder:text-wabi-fg-muted focus-visible:border-wabi-fg md:text-sm"
            />
          </div>
        )}
        {error && (
          <p role="alert" className="mb-2 break-keep text-xs text-red-700">
            {error}
          </p>
        )}
        <ChatComposer
          textareaRef={input}
          onSend={(text) => onSend(text, askEmail && email.trim() ? email.trim() : undefined)}
        />
        <p className="mt-2 break-keep text-[10px] leading-4 text-wabi-fg-muted">
          상담 내용은 응대를 위해 마지막 상담일로부터 3년간 보관합니다.{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
        </p>
      </div>
    </section>
  );
}

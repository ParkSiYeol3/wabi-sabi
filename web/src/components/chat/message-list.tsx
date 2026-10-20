"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { chatDay, chatTime, type ChatMessage, type ChatSender } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

// 대화 목록(#881) — 손님 창과 관리자 화면이 함께 쓴다. mine 쪽 말풍선이 오른쪽(먹색).
// 날짜가 바뀌면 구분선. 새 메시지가 오면 맨 아래에 있을 때만 따라 내려간다(위로 올려
// 지난 대화를 읽는 중이면 끌어내리지 않는다).
export function MessageList({
  messages,
  mine,
  theirLabel,
  intro,
  className,
}: {
  messages: ChatMessage[];
  mine: ChatSender;
  theirLabel: string;
  intro?: React.ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastId = messages.at(-1)?.id;

  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={box}
      role="log"
      aria-live="polite"
      aria-label="대화 내용"
      className={cn("overflow-y-auto overscroll-contain px-4 py-4", className)}
    >
      {intro}
      <ol className="space-y-2">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || chatDay(prev.created_at) !== chatDay(m.created_at);
          const isMine = m.sender === mine;
          const showName =
            !isMine && (!prev || prev.sender !== m.sender || newDay);
          return (
            <li key={m.id}>
              {newDay && (
                <p className="my-3 text-center font-numeric text-[11px] text-wabi-fg-muted">
                  {chatDay(m.created_at)}
                </p>
              )}
              {showName && (
                <p className="mb-1 text-[11px] text-wabi-fg-muted">{theirLabel}</p>
              )}
              <div className={cn("flex items-end gap-1.5", isMine && "flex-row-reverse")}>
                <p
                  className={cn(
                    "max-w-[78%] whitespace-pre-wrap break-words px-3 py-2 text-sm leading-6",
                    isMine
                      ? "rounded-2xl rounded-br-sm bg-wabi-accent text-white"
                      : "rounded-2xl rounded-bl-sm border border-wabi-border bg-wabi-bg text-wabi-fg",
                  )}
                >
                  {m.body}
                </p>
                <time
                  dateTime={m.created_at}
                  className="shrink-0 pb-0.5 font-numeric text-[10px] text-wabi-fg-muted"
                >
                  {chatTime(m.created_at)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

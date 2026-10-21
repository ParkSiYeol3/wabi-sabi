"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { chatDay, chatTime, type ChatMessage, type ChatSender } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

// 대화 목록(#881) — 손님 창과 관리자 화면이 함께 쓴다. mine 쪽 말풍선이 오른쪽(먹색).
// 상대 쪽은 카카오톡처럼 묶음 첫 줄에 프로필 사진·이름, 이어지는 말풍선은 그 옆으로 맞춘다.
// 날짜가 바뀌면 구분선. 새 메시지가 오거나 창 높이가 줄면(휴대폰 키보드) 맨 아래에 있을
// 때만 따라 내려간다(위로 올려 지난 대화를 읽는 중이면 끌어내리지 않는다).
export function MessageList({
  messages,
  mine,
  theirLabel,
  theirAvatar,
  introText,
  className,
}: {
  messages: ChatMessage[];
  mine: ChatSender;
  theirLabel: string;
  theirAvatar: React.ReactNode;
  // 상대가 먼저 건네는 첫인사(저장하지 않는 고정 문구).
  introText?: string;
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
    const ro = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    el.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  const theirs = (start: boolean, bubble: React.ReactNode, key?: React.Key) => (
    <div key={key} className="flex items-start gap-2">
      <div className="w-9 shrink-0">{start && theirAvatar}</div>
      <div className="min-w-0 flex-1">
        {start && <p className="mb-1 text-xs text-wabi-fg-muted">{theirLabel}</p>}
        {bubble}
      </div>
    </div>
  );

  return (
    <div
      ref={box}
      role="log"
      aria-live="polite"
      aria-label="대화 내용"
      className={cn("overflow-y-auto overscroll-contain px-4 py-4", className)}
    >
      {introText &&
        theirs(
          true,
          <p className="max-w-[85%] whitespace-pre-line break-keep rounded-2xl rounded-tl-sm border border-wabi-border bg-wabi-bg px-3 py-2 text-sm leading-6 text-wabi-fg">
            {introText}
          </p>,
        )}
      <ol className={cn("space-y-2", introText && "mt-2")}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || chatDay(prev.created_at) !== chatDay(m.created_at);
          const isMine = m.sender === mine;
          const start = !isMine && (!prev || prev.sender !== m.sender || newDay);
          const time = (
            <time
              dateTime={m.created_at}
              className="shrink-0 pb-0.5 font-numeric text-[10px] text-wabi-fg-muted"
            >
              {chatTime(m.created_at)}
            </time>
          );
          return (
            <li key={m.id}>
              {newDay && (
                <p className="my-3 text-center font-numeric text-[11px] text-wabi-fg-muted">
                  {chatDay(m.created_at)}
                </p>
              )}
              {isMine ? (
                <div className="flex flex-row-reverse items-end gap-1.5">
                  <p className="max-w-[78%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-sm bg-wabi-accent px-3 py-2 text-sm leading-6 text-white">
                    {m.body}
                  </p>
                  {time}
                </div>
              ) : (
                theirs(
                  start,
                  <div className="flex items-end gap-1.5">
                    <p
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl border border-wabi-border bg-wabi-bg px-3 py-2 text-sm leading-6 text-wabi-fg",
                        start && "rounded-tl-sm",
                      )}
                    >
                      {m.body}
                    </p>
                    {time}
                  </div>,
                )
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

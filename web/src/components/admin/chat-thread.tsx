"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminLoadThread, adminSendChat } from "@/app/admin/chats/actions";
import { mergeMessages, type ChatMessage } from "@/lib/chat-types";
import { MessageList } from "@/components/chat/message-list";
import { ChatComposer } from "@/components/chat/chat-composer";

// 채팅 상담(#881) 대표님 대화 화면 — 3초마다 새 메시지를 묻고, 보고 있는 동안은 읽음.
export function ChatThread({
  threadId,
  initial,
}: {
  threadId: string;
  initial: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef<number | undefined>(initial.at(-1)?.id);

  const poll = useCallback(async () => {
    try {
      const next = await adminLoadThread(threadId, lastId.current);
      if (next.length) {
        lastId.current = next.at(-1)!.id;
        setMessages((prev) => mergeMessages(prev, next));
      }
    } catch {}
  }, [threadId]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) void poll();
    }, 3_000);
    return () => clearInterval(t);
  }, [poll]);

  const send = useCallback(
    async (text: string) => {
      let r: Awaited<ReturnType<typeof adminSendChat>>;
      try {
        r = await adminSendChat(threadId, text);
      } catch {
        setError("보내지 못했습니다. 연결을 확인하고 다시 보내 주세요.");
        return false;
      }
      if (!r.ok) {
        setError(r.error);
        return false;
      }
      setError(null);
      lastId.current = Math.max(lastId.current ?? 0, r.message.id);
      setMessages((prev) => mergeMessages(prev, [r.message]));
      return true;
    },
    [threadId],
  );

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-96 flex-col overflow-hidden rounded-xl border border-wabi-border bg-wabi-subtle/30">
      <MessageList
        className="min-h-0 flex-1"
        messages={messages}
        mine="admin"
        theirLabel="손님"
      />
      <div className="border-t border-wabi-border bg-wabi-bg px-3 py-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <ChatComposer onSend={send} placeholder="답장을 입력해 주세요" />
      </div>
    </div>
  );
}

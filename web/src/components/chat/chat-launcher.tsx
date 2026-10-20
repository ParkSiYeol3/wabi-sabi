"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { privacyV3Active } from "@/lib/legal";
import { loadChat, sendChat } from "@/app/chat/actions";
import { mergeMessages, type ChatMessage } from "@/lib/chat-types";

// 채팅 상담(#881) 손님 쪽 — 오른쪽 아래 버튼과 대화 창.
// - 처리방침 개정 시행일 전엔 관리자에게만 보인다(미리 써 보기).
// - 관리자·결제 화면에선 숨긴다(결제 버튼을 가리지 않게).
// - 모바일 구매 바·가입 쿠폰 카드가 떠 있으면 그 위로 비켜 선다(--dock-*).
// - 창이 열려 있으면 3초, 닫혀 있고 대화가 있으면 1분마다 새 답을 묻는다. 탭이 안 보일
//   땐 묻지 않는다. 대화가 없는 손님에겐 아무 요청도 하지 않는다.
// 대화 창 코드는 처음 열 때 불러온다(첫 화면 로딩에 영향 없게).

const ChatPanel = dynamic(() => import("./chat-panel").then((m) => m.ChatPanel), {
  ssr: false,
});

const THREAD_FLAG = "wasa_chat_thread";
const OPEN_POLL_MS = 3_000;
const CLOSED_POLL_MS = 60_000;

function hiddenOn(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/checkout");
}

function readFlag(): boolean {
  try {
    return localStorage.getItem(THREAD_FLAG) === "1";
  } catch {
    return false;
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(THREAD_FLAG, "1");
    else localStorage.removeItem(THREAD_FLAG);
  } catch {}
}

export function ChatLauncher() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const uid = useAuthStore((s) => s.user?.id ?? null);
  const authLoading = useAuthStore((s) => s.loading);
  if (authLoading) return null;
  if (!privacyV3Active() && !isAdmin) return null;
  if (hiddenOn(pathname)) return null;
  // 로그인·로그아웃으로 사람이 바뀌면 상태를 새로 시작한다.
  return <ChatWidget key={uid ?? "guest"} member={!!uid} />;
}

function ChatWidget({ member }: { member: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasThread, setHasThread] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef<number | undefined>(undefined);
  const launcher = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async (markRead: boolean) => {
    try {
      const snap = await loadChat({ afterId: lastId.current, markRead });
      if (!snap.enabled) return;
      setHasThread(snap.hasThread);
      setGuestEmail(snap.guestEmail);
      setUnread(markRead ? 0 : snap.unread);
      writeFlag(snap.hasThread);
      if (snap.messages.length) {
        lastId.current = snap.messages.at(-1)!.id;
        setMessages((prev) => mergeMessages(prev, snap.messages));
      }
    } catch {
      // 네트워크가 잠깐 끊겨도 다음 차례에 다시 묻는다.
    }
  }, []);

  // 처음: 회원이거나 이 브라우저에 대화가 있을 때만 불러온다(안 읽은 답 표시).
  useEffect(() => {
    if (member || readFlag()) void refresh(false);
  }, [member, refresh]);

  useEffect(() => {
    if (!open && !hasThread) return;
    const t = setInterval(
      () => {
        if (!document.hidden) void refresh(open);
      },
      open ? OPEN_POLL_MS : CLOSED_POLL_MS,
    );
    return () => clearInterval(t);
  }, [open, hasThread, refresh]);

  const openChat = () => {
    setOpen(true);
    setUnread(0);
    void refresh(true);
  };

  const closeChat = useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);

  const send = useCallback(async (text: string, email?: string) => {
    const r = await sendChat({ body: text, email });
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setError(null);
    setHasThread(true);
    writeFlag(true);
    if (email) setGuestEmail(email);
    lastId.current = Math.max(lastId.current ?? 0, r.message.id);
    setMessages((prev) => mergeMessages(prev, [r.message]));
    return true;
  }, []);

  return (
    <>
      {!open && (
        <button
          ref={launcher}
          type="button"
          onClick={openChat}
          aria-label={unread ? `채팅 상담, 새 답변 ${unread}개` : "채팅 상담"}
          style={{
            bottom:
              "max(calc(1rem + env(safe-area-inset-bottom)), calc(var(--dock-buybar, 0px) + 0.75rem), calc(var(--dock-coupon, 0px) + 0.75rem))",
          }}
          className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-wabi-accent text-white shadow-[0_6px_24px_rgba(0,0,0,0.22)] transition-[transform,bottom] duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wabi-fg motion-reduce:transition-none md:right-6 md:w-auto md:px-4"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span className="hidden text-sm md:inline">채팅 상담</span>
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 font-numeric text-[11px] leading-none text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}
      {open && (
        <ChatPanel
          messages={messages}
          member={member}
          hasThread={hasThread}
          guestEmail={guestEmail}
          error={error}
          onSend={send}
          onClose={closeChat}
        />
      )}
    </>
  );
}

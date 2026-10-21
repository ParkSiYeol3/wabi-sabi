"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { site } from "@/lib/site";
import type { ChatMessage } from "@/lib/chat-types";
import { MessageList } from "./message-list";
import { ChatComposer } from "./chat-composer";
import { BrandAvatar } from "./chat-avatar";

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
  const dialog = useRef<HTMLElement>(null);
  const askEmail = !member && !guestEmail;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 컴퓨터에선 바로 입력할 수 있게 입력칸에 포커스. 휴대폰은 키보드가 화면을 덮으니
  // 창 자체로 포커스만 옮긴다(화면낭독기가 창 안에서 시작). 휴대폰에선 창이 화면 전체라
  // 뒤 페이지가 같이 스크롤되지 않게 잠근다.
  // 또 휴대폰 창은 '실제로 보이는 영역'(visualViewport)에 맞춘다. 키보드가 올라오거나
  // 브라우저 주소창·도구 막대가 들고 나도 입력칸과 맨 아래 안내가 가려지지 않게.
  // 키보드가 떠 있으면(data-kb) 홈 바 몫 아래 여백은 필요 없어 줄인다(globals.css).
  // 창이 열린 동안 뒤 페이지는 통째로 감춘다(data-chat-open, globals.css). iOS 키보드와
  // 도구 막대가 반투명이라 창 아래로 뒤 페이지가 비쳐 헷갈렸다(시열님).
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) {
      input.current?.focus();
      return;
    }
    const el = dialog.current;
    el?.focus();
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    root.setAttribute("data-chat-open", "");
    // iOS 는 overflow:hidden 만으론 손가락 스크롤을 못 막아, 끌면 뒤 문서와 보이는 영역이
    // 움직이고 창이 그걸 뒤쫓느라 방방 뛰었다(시열님). 창 안에서 실제로 더 스크롤할 수
    // 있는 곳(지난 대화 목록)이 아니면 끄는 동작을 막는다. 입력칸은 글자 선택·커서 이동이
    // 있어 그대로 둔다. 두 손가락(확대)도 그대로.
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - lastY;
      lastY = y;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("textarea, input")) return;
      for (let n = target; n && n !== el; n = n.parentElement) {
        if (!(n instanceof HTMLElement) || n.scrollHeight <= n.clientHeight) continue;
        const { overflowY } = getComputedStyle(n);
        if (overflowY !== "auto" && overflowY !== "scroll") continue;
        const atTop = n.scrollTop <= 0;
        const atBottom = n.scrollTop + n.clientHeight >= n.scrollHeight - 1;
        if ((dy > 0 && !atTop) || (dy < 0 && !atBottom)) return;
        break;
      }
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    const vv = window.visualViewport;
    const fit = () => {
      if (!el || !vv) return;
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
      el.style.bottom = "auto";
      el.toggleAttribute("data-kb", root.clientHeight - vv.height > 120);
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    return () => {
      root.style.overflow = prev;
      root.removeAttribute("data-chat-open");
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
    };
  }, []);

  const introText =
    "안녕하세요, 와비사비입니다.\n궁금한 점을 남겨 주시면 영업시간에 순서대로 답해 드리겠습니다." +
    (!member && !hasThread ? "\n창을 닫으셔도 대화는 이 브라우저에 남습니다." : "");

  return (
    <section
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="chat-title"
      className="fixed inset-0 z-[55] flex flex-col chat-sheet bg-wabi-bg outline-none md:inset-auto md:bottom-6 md:right-6 md:h-[min(36rem,calc(100dvh-3rem))] md:w-[22.5rem] md:border md:border-wabi-border md:shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
    >
      {/* 머리말은 메뉴와 같은 시스템 고딕 — 본문 붓 명조(Light 한 굵기)는 작은 글씨가
          흐려 보였다(시열님). */}
      <header
        className="flex items-center gap-3 border-b border-wabi-border bg-wabi-subtle/60 px-4 pb-3 font-pretendard"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <BrandAvatar size={40} />
        <div className="min-w-0 flex-1">
          <h2 id="chat-title" className="text-[15px] font-semibold leading-tight text-wabi-fg">
            와비사비 채팅 상담
          </h2>
          <p className="mt-1 break-keep text-[12.5px] leading-snug text-wabi-fg/80 lining-nums">
            영업시간 {site.hours}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="채팅 닫기"
          className="-mr-2 p-2 text-wabi-fg/70 transition-colors hover:text-wabi-fg"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <MessageList
        className="min-h-0 flex-1"
        messages={messages}
        mine="customer"
        theirLabel="와비사비"
        theirAvatar={<BrandAvatar />}
        introText={introText}
      />

      <div className="chat-safe-bottom border-t border-wabi-border px-3 pt-3">
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

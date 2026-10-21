import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation";
import { chatWho, type ChatMessage } from "@/lib/chat-types";
import { adminAction } from "@/components/admin/ui";
import { ChatThread } from "@/components/admin/chat-thread";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminDeleteChat } from "../actions";

export const metadata: Metadata = { title: "채팅 상담" };

type Thread = {
  id: string;
  user_id: string | null;
  guest_key_hash: string | null;
  guest_email: string | null;
  created_at: string;
  profiles: { name: string | null; email: string | null } | null;
};

// 채팅 상담(#881) 대화 하나 — 손님 정보·대화·답장·삭제. 열면 읽음으로 바뀐다.
export default async function AdminChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const db = createAdminClient();
  const { data: thread } = await db
    .from("chat_threads")
    .select("id, user_id, guest_key_hash, guest_email, created_at, profiles(name, email)")
    .eq("id", id)
    .maybeSingle<Thread>();
  if (!thread) notFound();

  const { data: recent } = await db
    .from("chat_messages")
    .select("id, sender, body, created_at")
    .eq("thread_id", id)
    .order("id", { ascending: false })
    .limit(200)
    .returns<ChatMessage[]>();
  await db
    .from("chat_threads")
    .update({ admin_read_at: new Date().toISOString() })
    .eq("id", id);

  const contact = thread.profiles?.email ?? thread.guest_email;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/chats"
            className="mb-1 inline-flex items-center gap-0.5 text-xs text-wabi-fg-muted hover:text-wabi-fg"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            채팅 상담
          </Link>
          <h1 className="truncate text-xl font-semibold text-wabi-fg">{chatWho(thread)}</h1>
          <p className="mt-1 break-all text-sm text-wabi-fg-muted">
            {thread.user_id ? "회원" : thread.guest_key_hash ? "비회원" : "탈퇴한 회원"}
            {contact && (
              <>
                {" · "}
                <a href={`mailto:${contact}`} className="underline underline-offset-2">
                  {contact}
                </a>
              </>
            )}
          </p>
        </div>
        <ConfirmAction
          action={adminDeleteChat}
          fields={{ id }}
          title="이 대화를 삭제할까요?"
          description="대화 전체가 지워지며 되돌릴 수 없습니다. 손님 화면에서도 사라집니다."
          confirmLabel="삭제"
          pendingText="삭제 중…"
          trigger="대화 삭제"
          triggerClassName={adminAction({ tone: "danger" })}
        />
      </div>
      <ChatThread threadId={id} initial={(recent ?? []).reverse()} />
    </>
  );
}

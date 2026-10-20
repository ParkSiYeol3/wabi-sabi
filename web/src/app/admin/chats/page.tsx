import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { chatDay, chatTime, chatUnread, chatWho } from "@/lib/chat-types";
import { privacyV3Active } from "@/lib/legal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "채팅 상담" };

type Row = {
  id: string;
  user_id: string | null;
  guest_key_hash: string | null;
  guest_email: string | null;
  last_message_at: string;
  last_sender: "customer" | "admin" | null;
  last_preview: string | null;
  admin_read_at: string | null;
  profiles: { name: string | null; email: string | null } | null;
};

// 채팅 상담(#881) 목록 — 최근 대화 순, 새 메시지는 위에 표시. 15초마다 새로 그린다.
export default async function AdminChatsPage() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("chat_threads")
    .select(
      "id, user_id, guest_key_hash, guest_email, last_message_at, last_sender, last_preview, admin_read_at, profiles(name, email)",
    )
    .order("last_message_at", { ascending: false })
    .limit(100)
    .returns<Row[]>();
  const rows = data ?? [];
  const unread = rows.filter(chatUnread).length;

  return (
    <>
      <AutoRefresh ms={15_000} />
      <PageHeader
        title="채팅 상담"
        description={
          unread ? `새 메시지가 있는 대화 ${unread}개` : "새 메시지가 없습니다."
        }
      />
      {!privacyV3Active() && (
        <p className="mb-4 break-keep border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          아직 손님에게는 채팅 버튼이 보이지 않습니다. 처리방침 개정 공지 후 시행일부터
          보입니다. 지금은 관리자 계정으로 사이트에서 미리 써 볼 수 있습니다.
        </p>
      )}
      {!rows.length ? (
        <EmptyState>아직 채팅 상담이 없습니다.</EmptyState>
      ) : (
        <ul className="divide-y divide-wabi-border overflow-hidden rounded-xl border border-wabi-border bg-wabi-bg/40">
          {rows.map((r) => {
            const isNew = chatUnread(r);
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/chats/${r.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-wabi-muted/60"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 h-2 w-2 shrink-0 rounded-full",
                      isNew ? "bg-red-700" : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", isNew && "font-semibold")}>
                        {chatWho(r)}
                        {isNew && <span className="sr-only"> (새 메시지)</span>}
                      </p>
                      <time
                        dateTime={r.last_message_at}
                        className="shrink-0 font-numeric text-xs text-wabi-fg-muted"
                      >
                        {chatDay(r.last_message_at)} {chatTime(r.last_message_at)}
                      </time>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-wabi-fg-muted">
                      {r.last_sender === "admin" && "나: "}
                      {r.last_preview}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

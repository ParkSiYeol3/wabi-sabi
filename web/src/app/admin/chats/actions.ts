"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import { parseUuid, uuidSchema } from "@/lib/validation";
import { CHAT_MAX, type ChatMessage, type ChatSendResult } from "@/lib/chat-types";

// 채팅 상담(#881) 대표님 쪽 — 답장·읽음·삭제. 대화 화면이 몇 초마다 새 메시지를 묻는다.

export async function adminLoadThread(
  threadId: string,
  afterId?: number,
): Promise<ChatMessage[]> {
  await requireAdmin();
  if (!uuidSchema.safeParse(threadId).success) return [];
  const db = createAdminClient();
  let q = db
    .from("chat_messages")
    .select("id, sender, body, created_at")
    .eq("thread_id", threadId)
    .order("id", { ascending: true })
    .limit(200);
  if (Number.isSafeInteger(afterId) && (afterId ?? 0) > 0) q = q.gt("id", afterId!);
  const { data } = await q.returns<ChatMessage[]>();
  // 보고 있는 동안 들어온 손님 메시지도 읽은 것으로.
  await db
    .from("chat_threads")
    .update({ admin_read_at: new Date().toISOString() })
    .eq("id", threadId);
  return data ?? [];
}

export async function adminSendChat(threadId: string, rawBody: string): Promise<ChatSendResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(threadId).success) {
    return { ok: false, error: "대화를 찾을 수 없습니다." };
  }
  const body = String(rawBody ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body) return { ok: false, error: "메시지를 입력해 주세요." };
  if (body.length > CHAT_MAX) {
    return { ok: false, error: `메시지는 ${CHAT_MAX.toLocaleString()}자까지 보낼 수 있습니다.` };
  }

  const db = createAdminClient();
  const { data: message, error } = await db
    .from("chat_messages")
    .insert({ thread_id: threadId, sender: "admin", body })
    .select("id, sender, body, created_at")
    .single<ChatMessage>();
  if (error || !message) {
    return { ok: false, error: "보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  await db
    .from("chat_threads")
    .update({
      last_message_at: message.created_at,
      last_sender: "admin",
      last_preview: body.slice(0, 120),
      last_admin_at: message.created_at,
      admin_read_at: message.created_at,
    })
    .eq("id", threadId);
  revalidatePath("/admin/chats");
  return { ok: true, message };
}

// 대화 통째로 삭제(되돌릴 수 없음 → 확인 창 뒤에서만 부른다).
export async function adminDeleteChat(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = parseUuid(formData.get("id"));
  if (!id) return;
  const { error } = await createAdminClient().from("chat_threads").delete().eq("id", id);
  if (!error) {
    await logAdminAction(user, { action: "chat.delete", targetTable: "chat_threads", targetId: id });
  }
  revalidatePath("/admin/chats");
  redirect("/admin/chats");
}

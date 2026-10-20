"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { privacyV3Active } from "@/lib/legal";
import { isPlaceholderEmail } from "@/lib/auth-input";
import { notifyNewChat } from "@/lib/emails/shop-alerts";
import {
  CHAT_MAX,
  type ChatMessage,
  type ChatSendResult,
  type ChatSnapshot,
} from "@/lib/chat-types";

// 채팅 상담(#881) 손님 쪽. 표는 anon 이 직접 못 읽으므로(0083) 여기서 신원을 확인하고
// service_role 로 그 사람의 방만 읽고 쓴다.
// - 회원: 로그인 계정(user_id).
// - 비회원: 처음 보낼 때 무작위 표식을 httpOnly 쿠키에 두고, DB 엔 그 sha256 만 둔다.
//   표식을 가진 브라우저만 자기 대화를 본다(쿠키는 스크립트로 읽을 수 없다).
// 시행일(처리방침 개정) 전에는 관리자만 쓸 수 있다.

const GUEST_COOKIE = "wasa_chat";
const GUEST_COOKIE_DAYS = 180;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THREAD_COLS =
  "id, user_id, guest_email, last_admin_at, admin_notified_at, customer_read_at";

type Thread = {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  last_admin_at: string | null;
  admin_notified_at: string | null;
  customer_read_at: string | null;
};

type Viewer = { userId: string | null; admin: boolean; guestHash: string | null };

function hashKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function viewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  const guestHash = token && /^[A-Za-z0-9_-]{40,64}$/.test(token) ? hashKey(token) : null;
  if (!user) return { userId: null, admin: false, guestHash };
  return { userId: user.id, admin: await isAdmin(), guestHash };
}

function chatOpen(v: Viewer): boolean {
  return privacyV3Active() || v.admin;
}

// 내 방 찾기. 회원인데 방이 없고 이 브라우저에 로그인 전 대화가 있으면 계정으로 옮긴다.
async function findThread(db: SupabaseClient, v: Viewer): Promise<Thread | null> {
  if (v.userId) {
    const { data } = await db
      .from("chat_threads")
      .select(THREAD_COLS)
      .eq("user_id", v.userId)
      .maybeSingle<Thread>();
    if (data) return data;
    if (!v.guestHash) return null;
    const { data: claimed } = await db
      .from("chat_threads")
      .update({ user_id: v.userId, guest_key_hash: null })
      .eq("guest_key_hash", v.guestHash)
      .is("user_id", null)
      .select(THREAD_COLS)
      .maybeSingle<Thread>();
    return claimed ?? null;
  }
  if (!v.guestHash) return null;
  const { data } = await db
    .from("chat_threads")
    .select(THREAD_COLS)
    .eq("guest_key_hash", v.guestHash)
    .is("user_id", null)
    .maybeSingle<Thread>();
  return data ?? null;
}

const LATEST = 200;

async function readMessages(
  db: SupabaseClient,
  threadId: string,
  afterId: number | undefined,
): Promise<ChatMessage[]> {
  if (afterId) {
    const { data } = await db
      .from("chat_messages")
      .select("id, sender, body, created_at")
      .eq("thread_id", threadId)
      .gt("id", afterId)
      .order("id", { ascending: true })
      .limit(LATEST)
      .returns<ChatMessage[]>();
    return data ?? [];
  }
  const { data } = await db
    .from("chat_messages")
    .select("id, sender, body, created_at")
    .eq("thread_id", threadId)
    .order("id", { ascending: false })
    .limit(LATEST)
    .returns<ChatMessage[]>();
  return (data ?? []).reverse();
}

// 창을 열 때·열려 있는 동안·닫혀 있을 때(안 읽은 답 수) 부른다.
export async function loadChat(
  input: { afterId?: number; markRead?: boolean } = {},
): Promise<ChatSnapshot> {
  const v = await viewer();
  const enabled = chatOpen(v);
  const empty: ChatSnapshot = {
    enabled,
    member: !!v.userId,
    hasThread: false,
    guestEmail: null,
    messages: [],
    unread: 0,
  };
  if (!enabled || !adminConfigured()) return empty;

  const db = createAdminClient();
  const thread = await findThread(db, v);
  if (!thread) return empty;

  const afterId =
    Number.isSafeInteger(input.afterId) && (input.afterId ?? 0) > 0 ? input.afterId : undefined;
  const messages = await readMessages(db, thread.id, afterId);

  let unread = 0;
  if (input.markRead) {
    await db
      .from("chat_threads")
      .update({ customer_read_at: new Date().toISOString() })
      .eq("id", thread.id);
  } else {
    let q = db
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", thread.id)
      .eq("sender", "admin");
    if (thread.customer_read_at) q = q.gt("created_at", thread.customer_read_at);
    const { count } = await q;
    unread = count ?? 0;
  }

  return {
    enabled,
    member: !!v.userId,
    hasThread: true,
    guestEmail: thread.guest_email,
    messages,
    unread,
  };
}

const TOO_MANY = "메시지를 너무 많이 보냈습니다. 잠시 후 다시 보내 주세요.";

export async function sendChat(input: {
  body: string;
  email?: string;
}): Promise<ChatSendResult> {
  const body = String(input.body ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body) return { ok: false, error: "메시지를 입력해 주세요." };
  if (body.length > CHAT_MAX) {
    return { ok: false, error: `메시지는 ${CHAT_MAX.toLocaleString()}자까지 보낼 수 있습니다.` };
  }
  const email = String(input.email ?? "").trim().toLowerCase();
  if (email && (!EMAIL_RE.test(email) || isPlaceholderEmail(email) || email.length > 254)) {
    return { ok: false, error: "이메일 주소를 다시 확인해 주세요." };
  }

  const v = await viewer();
  if (!chatOpen(v) || !adminConfigured()) {
    return { ok: false, error: "채팅 상담을 아직 이용할 수 없습니다." };
  }

  const ip = clientIpFromHeaders(await headers());
  const who = v.userId ?? v.guestHash ?? `ip:${ip}`;
  const [ipGate, whoGate] = await Promise.all([
    rateLimit(`chat-ip:${ip}`, 40, 600),
    rateLimit(`chat-who:${who}`, 20, 600),
  ]);
  if (!ipGate.ok || !whoGate.ok) return { ok: false, error: TOO_MANY };

  const db = createAdminClient();
  let thread = await findThread(db, v);

  if (!thread) {
    // 새 방은 IP 당 시간에 몇 개까지만(쿠키를 지워 가며 방을 찍어 내는 것 방지).
    const roomGate = await rateLimit(`chat-room:${ip}`, 5, 3600);
    if (!roomGate.ok) return { ok: false, error: TOO_MANY };

    if (v.userId) {
      const { data, error } = await db
        .from("chat_threads")
        .insert({ user_id: v.userId })
        .select(THREAD_COLS)
        .single<Thread>();
      // 동시에 두 번 보내 방이 이미 생겼으면(unique) 그 방을 쓴다.
      thread = error ? await findThread(db, v) : data;
    } else {
      const token = randomBytes(32).toString("base64url");
      const { data } = await db
        .from("chat_threads")
        .insert({ guest_key_hash: hashKey(token), guest_email: email || null })
        .select(THREAD_COLS)
        .single<Thread>();
      if (data) {
        (await cookies()).set(GUEST_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: GUEST_COOKIE_DAYS * 86_400,
        });
      }
      thread = data;
    }
    if (!thread) return { ok: false, error: "보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  } else if (!v.userId && email && email !== thread.guest_email) {
    await db.from("chat_threads").update({ guest_email: email }).eq("id", thread.id);
  }

  const { data: message, error } = await db
    .from("chat_messages")
    .insert({ thread_id: thread.id, sender: "customer", body })
    .select("id, sender, body, created_at")
    .single<ChatMessage>();
  if (error || !message) {
    console.error("[chat] 메시지 저장 실패", error?.code ?? error?.message);
    return { ok: false, error: "보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 대표님이 답한 뒤 다시 묻거나 처음 물을 때만 알림 메일(대화마다 쏟아지지 않게).
  const notify =
    !thread.admin_notified_at ||
    (!!thread.last_admin_at &&
      Date.parse(thread.admin_notified_at) < Date.parse(thread.last_admin_at));
  const now = new Date().toISOString();
  await db
    .from("chat_threads")
    .update({
      last_message_at: message.created_at,
      last_sender: "customer",
      last_preview: body.slice(0, 120),
      customer_read_at: now,
      ...(notify ? { admin_notified_at: now } : {}),
    })
    .eq("id", thread.id);

  if (notify) {
    const threadId = thread.id;
    const member = !!v.userId;
    after(() => notifyNewChat({ threadId, member }));
  }

  return { ok: true, message };
}

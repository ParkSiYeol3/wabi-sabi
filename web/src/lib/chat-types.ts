// 채팅 상담(#881) — 손님 창·관리자 화면·서버 액션이 함께 쓰는 형태와 표시 도우미.
// 클라이언트에서도 쓰므로 서버 전용 모듈을 들이지 않는다.

export type ChatSender = "customer" | "admin";

export type ChatMessage = {
  id: number;
  sender: ChatSender;
  body: string;
  created_at: string;
};

// 손님 창이 받는 상태. enabled=false 면 아직 시행 전(손님) → 창을 띄우지 않는다.
export type ChatSnapshot = {
  enabled: boolean;
  member: boolean;
  hasThread: boolean;
  guestEmail: string | null;
  messages: ChatMessage[];
  unread: number;
};

export type ChatSendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

export const CHAT_MAX = 1000;

// 같은 메시지를 두 번 받아도(폴링 겹침) 한 번만, id 순서로.
export function mergeMessages(prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  if (!next.length) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of next) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

const TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "numeric",
  minute: "2-digit",
});
const DAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
});

export function chatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

export function chatDay(iso: string): string {
  return DAY.format(new Date(iso));
}

// 관리자 목록·대시보드: 손님이 마지막으로 말했고 그 뒤로 대표님이 열어 보지 않았으면 새 메시지.
export function chatUnread(r: {
  last_sender: ChatSender | null;
  last_message_at: string;
  admin_read_at: string | null;
}): boolean {
  return (
    r.last_sender === "customer" &&
    (!r.admin_read_at || Date.parse(r.admin_read_at) < Date.parse(r.last_message_at))
  );
}

// 관리자 화면의 상대 이름. 회원은 이름(없으면 이메일), 비회원은 남긴 이메일, 탈퇴는 표시.
export function chatWho(r: {
  user_id: string | null;
  guest_email: string | null;
  profiles: { name: string | null; email: string | null } | null;
  guest_key_hash?: string | null;
}): string {
  if (r.profiles) return r.profiles.name || r.profiles.email || "회원";
  if (!r.user_id && r.guest_key_hash === null) return "탈퇴한 회원";
  if (r.guest_email) return `비회원 · ${r.guest_email}`;
  return "비회원";
}

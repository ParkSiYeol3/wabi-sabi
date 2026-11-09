import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/site-url";

// 광고 메일 수신거부 링크(#919). 정보통신망법(KISA 안내서): 메일 안의 [수신거부]를 누르면
// 로그인 없이 곧바로 거부할 수 있어야 한다. 그래서 링크에 회원 id 와 서명을 담는다.
// 서명이 없으면 남의 id 로 거부를 걸 수 있으니, 서버 비밀로 만든 HMAC 만 받는다.
//
// 키는 UNSUBSCRIBE_SECRET, 없으면 service_role 키에서 만든다(서버에만 있는 값). 키를 바꾸면
// 이미 보낸 메일의 링크가 안 먹으니 바꿀 땐 마이페이지 '소식 받기'로도 끌 수 있다고 안내한다.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function sign(userId: string, key: string): string {
  return createHmac("sha256", key).update(`unsubscribe:v1:${userId}`).digest("base64url");
}

export function unsubscribeUrl(userId: string): string | null {
  const key = secret();
  if (!key || !UUID_RE.test(userId)) return null;
  const t = sign(userId, key);
  return `${SITE_URL}/unsubscribe?u=${userId}&t=${t}`;
}

export function verifyUnsubscribe(userId: unknown, token: unknown): userId is string {
  const key = secret();
  if (!key || typeof userId !== "string" || typeof token !== "string") return false;
  if (!UUID_RE.test(userId)) return false;
  const want = Buffer.from(sign(userId, key));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

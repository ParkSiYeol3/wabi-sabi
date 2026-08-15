"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

// 연속 로그인 실패 제한(무차별 대입 방어) — rate-limit 게이트만 서버에서 강제하고,
// 실제 signInWithPassword 는 클라이언트가 수행한다. (로그인을 서버로 완전히 옮기면
// 클라 supabase 인스턴스의 onAuthStateChange 가 안 터져 로그인 직후 UI 가 비로그인으로
// 보였다 — 전체 새로고침 전까지 상태 미반영. 세션·상태 흐름은 클라에 두고 게이트만 서버.)
// rate-limit 인프라(#16)는 고정 창 카운터로 reset 이 없어 "시도 제한"으로 구현:
// 게이트 진입 시 카운트를 올리고 한도를 넘으면 통과시키지 않는다(클라가 signIn 을 아예
// 시도하지 않음). 성공해도 창이 만료되며 자연 회복하므로 넉넉한 한도로 정상 사용자는
// 방해하지 않는다. 키는 계정(이메일 해시)·IP 두 축.
const ACCOUNT_LIMIT = 10; // 계정당 (오타 재시도 여유)
const IP_LIMIT = 30; // IP당 (회사·카페 공유 IP 고려해 넉넉)
const WINDOW_SEC = 600; // 10분

type GateResult = { ok: true } | { ok: false; error: string };

// 로그인 시도 게이트 — 통과(ok)하면 클라가 signInWithPassword 를 진행한다. 이메일만
// 받아 카운트(비밀번호는 서버로 보내지 않는다). 시도마다 카운트 = "시도 제한".
export async function loginGate(email: string): Promise<GateResult> {
  const cleanEmail = email.trim().toLowerCase();
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  // 이메일 원문을 카운터 키(로그·저장)에 노출하지 않도록 해시.
  const idKey = createHash("sha256").update(cleanEmail).digest("hex").slice(0, 32);

  const [ipGate, idGate] = await Promise.all([
    rateLimit(`login-ip:${ip}`, IP_LIMIT, WINDOW_SEC),
    rateLimit(`login-id:${idKey}`, ACCOUNT_LIMIT, WINDOW_SEC),
  ]);
  if (!ipGate.ok || !idGate.ok) {
    return {
      ok: false,
      error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  return { ok: true };
}

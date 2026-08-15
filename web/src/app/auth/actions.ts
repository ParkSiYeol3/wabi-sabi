"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

// 연속 로그인 실패 제한(무차별 대입 방어) — 로그인을 서버 액션으로 프록시해 시도를
// 센다. rate-limit 인프라(#16)는 고정 창 카운터로 reset 이 없어 "시도 제한"으로 구현:
// 진입 시 카운트를 올리고 한도를 넘으면 Supabase 인증을 호출하기 전에 차단한다. 성공해도
// 창이 만료되며 자연 회복하므로, 넉넉한 한도로 정상 사용자는 방해하지 않는다.
// 키는 계정(이메일 해시)·IP 두 축 — 한 계정 집중 공격과 한 IP 분산 공격을 모두 막는다.
const ACCOUNT_LIMIT = 10; // 계정당 (오타 재시도 여유)
const IP_LIMIT = 30; // IP당 (회사·카페 공유 IP 고려해 넉넉)
const WINDOW_SEC = 600; // 10분

type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(
  email: string,
  password: string,
): Promise<LoginResult> {
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });
  if (error) {
    // 계정 존재 여부를 드러내지 않는 통합 메시지(열거 방지).
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  return { ok: true };
}

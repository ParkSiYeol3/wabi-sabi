"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { isPlaceholderEmail, passwordPolicyError } from "@/lib/auth-input";
import { hangulToQwerty } from "@/lib/hangul-keys";

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
      error:
        "로그인 시도가 너무 많습니다. 약 10분 후 다시 시도해 주세요.",
    };
  }
  return { ok: true };
}

// ── 비밀번호 찾기 ─────────────────────────────────────────
// 메일 링크는 Supabase 재설정 메일 템플릿(lib/emails/auth-templates.ts)이
// /auth/reset#token_hash=… 로 만든다. 기본 템플릿의 PKCE 링크는 요청한 브라우저에서만
// 열려(PC 에서 요청하고 휴대폰 메일 앱에서 열면 실패) token_hash 방식으로 바꿨다.
//
// 세션을 남기지 않는 일회용 클라이언트 — 재설정은 쿠키 로그인 없이 끝내고, 끝나면 모든
// 기기에서 로그아웃시켜 새 비밀번호로 다시 들어오게 한다(서버에서 세션을 만들면 클라
// 상태가 새로고침 전까지 따라오지 못한다, #483).
function oneShotClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "implicit",
      },
    },
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 재설정 메일 요청. 가입 여부를 드러내지 않도록 형식·횟수 오류 말고는 늘 같은 답을 준다.
export async function requestPasswordReset(email: string): Promise<GateResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail) || isPlaceholderEmail(cleanEmail)) {
    return { ok: false, error: "이메일 주소를 다시 확인해 주세요." };
  }
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const idKey = createHash("sha256").update(cleanEmail).digest("hex").slice(0, 32);
  const [ipGate, idGate] = await Promise.all([
    rateLimit(`pwreset-ip:${ip}`, 10, 3600),
    rateLimit(`pwreset-id:${idKey}`, 3, 3600),
  ]);
  if (!ipGate.ok || !idGate.ok) {
    return {
      ok: false,
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  const { error } = await oneShotClient().auth.resetPasswordForEmail(cleanEmail);
  // 같은 계정 60초 재요청 제한 같은 오류는 가입된 계정에서만 나 가입 여부가 드러난다
  // → 손님에겐 같은 답을 주고 서버 로그에만 남긴다.
  if (error) console.error("[password-reset] request", error.code ?? error.message);
  return { ok: true };
}

export type ResetResult =
  | { ok: true }
  | { ok: false; error: string; reason?: "expired" | "same" };

const EXPIRED =
  "링크가 만료됐거나 이미 사용됐습니다. 비밀번호 찾기를 다시 요청해 주세요.";

// 새 비밀번호 저장 — 메일 링크의 token_hash 를 확인하는 순간 바로 바꾼다. 메일 보안
// 검사기가 링크를 미리 열어도 토큰이 쓰이지 않게, 확인은 이 제출 때만 한다.
export async function resetPassword(input: {
  tokenHash: string;
  password: string;
  password2: string;
}): Promise<ResetResult> {
  const password = hangulToQwerty(input.password);
  if (password !== hangulToQwerty(input.password2)) {
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }
  const policy = passwordPolicyError(password);
  if (policy) return { ok: false, error: policy };
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(input.tokenHash)) {
    return { ok: false, error: EXPIRED, reason: "expired" };
  }
  const h = await headers();
  const gate = await rateLimit(`pwreset-set-ip:${clientIpFromHeaders(h)}`, 20, 3600);
  if (!gate.ok) {
    return {
      ok: false,
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const supabase = oneShotClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: input.tokenHash,
  });
  if (verifyError) return { ok: false, error: EXPIRED, reason: "expired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // 지금 비밀번호와 같다 = 기억한 비밀번호가 맞다 → 그대로 로그인하면 된다.
    if (error.code === "same_password") {
      await supabase.auth.signOut({ scope: "local" });
      return {
        ok: false,
        reason: "same",
        error: "입력하신 비밀번호가 지금 비밀번호와 같습니다. 이 비밀번호로 로그인해 주세요.",
      };
    }
    console.error("[password-reset] update", error.code ?? error.message);
    return { ok: false, error: EXPIRED, reason: "expired" };
  }
  // 다른 기기의 로그인도 모두 끊는다(비밀번호가 새어 바꾸는 경우 대비).
  await supabase.auth.signOut({ scope: "global" });
  return { ok: true };
}

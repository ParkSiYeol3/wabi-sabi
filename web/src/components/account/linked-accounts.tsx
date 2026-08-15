"use client";

import { useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// 소셜 계정 연결/해제 (WSB — 계정 관리). identity 목록으로 구글·카카오 연결 상태를
// 보여주고, 연결(linkIdentity)·해제(unlinkIdentity)한다. 초기 목록은 서버(마이페이지)가
// 조회해 props 로 넘긴다(effect 로 setState 하지 않음 — SSR 초기값·불필요한 리렌더 방지).
// 마지막 남은 로그인 수단(identity 1개)은 해제하면 로그인 불가가 되므로 막는다.
// linkIdentity 는 Supabase 대시보드의 Manual Linking 이 켜져 있어야 동작한다(👤 설정).

const SOCIALS = [
  { key: "google", label: "Google" },
  { key: "kakao", label: "카카오" },
] as const;

type Provider = (typeof SOCIALS)[number]["key"];

export function LinkedAccounts({
  initialIdentities,
}: {
  initialIdentities: UserIdentity[];
}) {
  const [identities, setIdentities] = useState<UserIdentity[]>(initialIdentities);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identityCount = identities.length;
  const hasEmail = identities.some((i) => i.provider === "email");

  async function onLink(provider: Provider) {
    setError(null);
    setBusy(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/mypage`,
      },
    });
    if (error) {
      setError("계정 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(null);
    }
    // 성공 시 OAuth 페이지로 리다이렉트된다(콜백이 /mypage 로 복귀 → 목록 최신화).
  }

  async function onUnlink(provider: Provider) {
    setError(null);
    const target = identities.find((i) => i.provider === provider);
    if (!target) return;
    // 마지막 로그인 수단 보호 — identity 가 하나뿐이면 해제 시 로그인할 방법이 사라진다.
    if (identityCount <= 1) {
      setError("마지막 로그인 수단은 해제할 수 없습니다.");
      return;
    }
    setBusy(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.unlinkIdentity(target);
    if (error) {
      setError("연결 해제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } else {
      setIdentities((prev) => prev.filter((i) => i.identity_id !== target.identity_id));
    }
    setBusy(null);
  }

  return (
    <section className="mt-14">
      <h2 className="text-lg font-medium">연결된 계정</h2>
      <p className="mt-1 text-sm text-wabi-fg-muted">
        소셜 계정을 연결하면 해당 계정으로도 로그인할 수 있습니다.
        {hasEmail && " 이메일·비밀번호 로그인은 기본으로 유지됩니다."}
      </p>

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border">
        {SOCIALS.map(({ key, label }) => {
          const linked = identities.some((i) => i.provider === key);
          const isBusy = busy === key;
          // 이 소셜이 유일한 로그인 수단이면 해제 불가.
          const lastRemaining = linked && identityCount <= 1;
          return (
            <li
              key={key}
              className="flex items-center justify-between py-4 text-sm"
            >
              <span className="font-medium">
                {label}
                <span className="ml-2 font-normal text-wabi-fg-muted">
                  {linked ? "연결됨" : "연결 안 됨"}
                </span>
              </span>
              {linked ? (
                <button
                  type="button"
                  onClick={() => onUnlink(key)}
                  disabled={isBusy || lastRemaining}
                  title={
                    lastRemaining
                      ? "마지막 로그인 수단은 해제할 수 없습니다."
                      : undefined
                  }
                  className="rounded-none border border-wabi-border px-4 py-1.5 text-xs text-wabi-fg-muted transition active:opacity-40 hover:border-wabi-fg hover:text-wabi-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isBusy ? "처리 중…" : "연결 해제"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onLink(key)}
                  disabled={isBusy}
                  className="rounded-none border border-wabi-border px-4 py-1.5 text-xs transition active:opacity-40 hover:bg-wabi-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isBusy ? "이동 중…" : "연결"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

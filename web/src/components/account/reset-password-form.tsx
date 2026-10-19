"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/account/password-input";
import { resetPassword, type ResetResult } from "@/app/auth/actions";

// 링크의 토큰(#token_hash=…). # 뒤는 서버로 가지 않아 브라우저에서 읽는다. 주소창에서
// 지운 뒤에도 쓰도록 처음 읽은 값을 붙잡아 둔다.
let captured: string | null | undefined;
function readToken(): string | null {
  if (captured === undefined) {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("token_hash");
    const fromQuery = new URLSearchParams(window.location.search).get("token_hash");
    captured = fromHash || fromQuery || null;
  }
  return captured;
}
const noSubscribe = () => () => {};

// 메일 링크로 들어와 새 비밀번호를 정한다. 링크의 토큰은 이 제출 때 처음 확인한다.
export function ResetPasswordForm() {
  // 서버 렌더에선 아직 모름(undefined) → 브라우저에서 토큰 또는 null.
  const tokenHash = useSyncExternalStore<string | null | undefined>(
    noSubscribe,
    readToken,
    () => undefined,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);

  // 주소창·방문 기록에 토큰이 남지 않게 지운다.
  useEffect(() => {
    if (tokenHash) window.history.replaceState(null, "", "/auth/reset");
  }, [tokenHash]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tokenHash) return;
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      setResult(
        await resetPassword({
          tokenHash,
          password: String(form.get("password") || ""),
          password2: String(form.get("password2") || ""),
        }),
      );
    } catch {
      setResult({ ok: false, error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok || (result && result.reason)) {
    const done = result.ok;
    return (
      <div role="status" className="space-y-3 text-sm leading-6 text-wabi-fg">
        <p className="break-keep font-medium">
          {done ? "비밀번호를 바꿨습니다." : result.error}
        </p>
        {done && (
          <p className="break-keep text-wabi-fg-muted">
            보안을 위해 모든 기기에서 로그아웃했습니다. 새 비밀번호로 로그인해 주세요.
          </p>
        )}
        {!done && result.reason === "expired" ? (
          <Link
            href="/auth/forgot"
            className="inline-block text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
          >
            비밀번호 찾기 다시 요청하기
          </Link>
        ) : (
          <Button asChild className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90">
            <Link href="/auth">로그인하기</Link>
          </Button>
        )}
      </div>
    );
  }

  if (tokenHash === undefined) return <div className="min-h-48" aria-hidden />;
  if (tokenHash === null) {
    return (
      <div className="space-y-3 text-sm leading-6">
        <p className="break-keep text-wabi-fg-muted">
          링크가 올바르지 않습니다. 메일의 버튼을 다시 눌러 주시거나, 비밀번호 찾기를 다시
          요청해 주세요.
        </p>
        <Link
          href="/auth/forgot"
          className="inline-block text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
        >
          비밀번호 찾기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="새 비밀번호 정하기">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs text-wabi-fg-muted">
          새 비밀번호
        </label>
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="new-password"
          className="rounded-none font-numeric"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="mt-1 font-numeric text-xs text-wabi-fg-muted">
          8자 이상, 영문과 숫자를 포함해 주세요.
        </p>
      </div>
      <div>
        <label htmlFor="password2" className="mb-1.5 block text-xs text-wabi-fg-muted">
          새 비밀번호 확인
        </label>
        <PasswordInput
          id="password2"
          name="password2"
          required
          autoComplete="new-password"
          className="rounded-none font-numeric"
        />
      </div>
      {result && !result.ok && (
        <p role="alert" className="font-numeric text-xs text-red-700">
          {result.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
      >
        {loading ? "저장하는 중…" : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}

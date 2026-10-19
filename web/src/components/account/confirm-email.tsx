"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/auth-input";

// 가입 인증 메일 링크(Supabase 템플릿: /auth/confirm#token_hash=…)를 받아 인증한다.
// 기본 템플릿의 PKCE 링크는 가입한 브라우저에서만 열려(휴대폰 메일 앱이면 실패) 바꿨다.
// 브라우저 클라이언트로 인증해 로그인(SIGNED_IN)이 바로 화면·장바구니에 반영된다.

const REDIRECT_KEY = "wasa:confirm-redirect";

// 가입할 때 돌아갈 곳을 기억해 둔다(같은 기기에서 메일을 열 때만 쓰인다).
export function rememberConfirmRedirect(path: string) {
  try {
    localStorage.setItem(REDIRECT_KEY, path);
  } catch {}
}

function takeConfirmRedirect(): string {
  try {
    const v = localStorage.getItem(REDIRECT_KEY);
    localStorage.removeItem(REDIRECT_KEY);
    return safeInternalPath(v);
  } catch {
    return "/";
  }
}

// # 뒤 토큰은 서버로 가지 않는다(요청 로그에 남지 않게). 주소창에서 지운 뒤에도 쓰도록
// 처음 읽은 값을 붙잡아 둔다.
let captured: string | null | undefined;
function readToken(): string | null {
  if (captured === undefined) {
    captured =
      new URLSearchParams(window.location.hash.slice(1)).get("token_hash") || null;
  }
  return captured;
}
const noSubscribe = () => () => {};

type Status = "verifying" | "done" | "failed";

export function ConfirmEmail() {
  const router = useRouter();
  const tokenHash = useSyncExternalStore<string | null | undefined>(
    noSubscribe,
    readToken,
    () => undefined,
  );
  const [status, setStatus] = useState<Status>("verifying");
  const started = useRef(false);

  useEffect(() => {
    if (!tokenHash || started.current) return;
    started.current = true;
    window.history.replaceState(null, "", "/auth/confirm");
    (async () => {
      const { error } = await createClient().auth.verifyOtp({
        type: "email",
        token_hash: tokenHash,
      });
      if (error) {
        setStatus("failed");
        return;
      }
      setStatus("done");
      router.replace(takeConfirmRedirect());
      router.refresh();
    })();
  }, [tokenHash, router]);

  if (tokenHash === undefined) return <div className="min-h-32" aria-hidden />;

  if (tokenHash === null || status === "failed") {
    return (
      <div role="status" className="space-y-3 text-sm leading-6">
        <p className="break-keep font-medium text-wabi-fg">
          {tokenHash === null
            ? "링크가 올바르지 않습니다."
            : "링크가 만료됐거나 이미 인증된 링크입니다."}
        </p>
        <p className="break-keep text-wabi-fg-muted">
          이미 인증하셨다면 로그인해 주세요. 링크를 받은 지 1시간이 지났다면 같은 이메일로
          다시 가입하시면 인증 메일을 다시 보내 드립니다.
        </p>
        <Button asChild className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90">
          <Link href="/auth">로그인하기</Link>
        </Button>
      </div>
    );
  }

  return (
    <p role="status" className="break-keep text-sm leading-6 text-wabi-fg-muted">
      {status === "done"
        ? "이메일 인증이 완료됐습니다. 잠시 후 이동합니다."
        : "이메일을 인증하고 있습니다…"}
    </p>
  );
}

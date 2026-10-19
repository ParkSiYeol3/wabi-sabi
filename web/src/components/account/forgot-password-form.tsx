"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/app/auth/actions";

// 비밀번호 찾기 — 이메일을 받아 재설정 메일을 보낸다. 가입 여부와 상관없이 같은 안내를
// 보여 준다(가입한 이메일인지 떠보는 용도로 쓰이지 않게).
export function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") || "");
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.ok) setSent(true);
      else setError(res.error);
    } catch {
      setError("요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="space-y-3 text-sm leading-6 text-wabi-fg">
        <p className="font-medium">재설정 메일을 보냈습니다.</p>
        <p className="break-keep text-wabi-fg-muted">
          가입된 이메일이면 몇 분 안에 메일이 도착합니다. 메일의 버튼을 눌러 새 비밀번호를
          정해 주세요. 링크는 1시간 동안 한 번 쓸 수 있습니다.
        </p>
        <p className="break-keep text-xs text-wabi-fg-muted">
          메일이 보이지 않으면 스팸함도 확인해 주세요.
        </p>
        <Link
          href="/auth"
          className="mt-2 inline-block text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="비밀번호 찾기">
      {expired && (
        <p
          role="status"
          className="border border-wabi-border bg-wabi-subtle/40 px-4 py-3 text-sm leading-6 text-wabi-fg-muted"
        >
          링크가 만료됐거나 이미 사용됐습니다. 다시 요청해 주세요.
        </p>
      )}
      <p className="break-keep text-sm leading-6 text-wabi-fg-muted">
        가입한 이메일을 입력하시면 새 비밀번호를 정할 수 있는 링크를 보내 드립니다.
      </p>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs text-wabi-fg-muted">
          이메일
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-none font-numeric"
        />
      </div>
      {error && (
        <p role="alert" className="font-numeric text-xs text-red-700">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
      >
        {loading ? "보내는 중…" : "재설정 메일 받기"}
      </Button>
      <p className="break-keep text-xs leading-5 text-wabi-fg-muted">
        카카오·구글로 가입하셨다면 로그인 화면의 해당 버튼으로 들어가 주세요.
      </p>
      <Link
        href="/auth"
        className="inline-block text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
      >
        로그인으로 돌아가기
      </Link>
    </form>
  );
}

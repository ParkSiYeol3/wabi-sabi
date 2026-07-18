"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  subscribeNewsletter,
  type NewsletterState,
} from "@/app/newsletter-actions";

// 뉴스레터 구독 폼 (#108) — 이전엔 action 없는 껍데기라 제출해도 아무 일이 없었다.
// 이메일 수집이라 개인정보처리방침 동의 체크가 필수(서버에서도 재검증).
export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(
    subscribeNewsletter,
    null,
  );

  return (
    <form action={action} className="mx-auto mt-8 max-w-md">
      <div className="flex gap-2">
        <Input
          type="email"
          name="email"
          required
          disabled={pending}
          placeholder="이메일을 입력하세요"
          aria-label="이메일 주소"
          className="rounded-none"
        />
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-wabi-accent px-6 hover:bg-wabi-accent/90"
        >
          {pending ? "처리 중…" : "구독하기"}
        </Button>
      </div>

      <label className="mt-3 flex items-start gap-2 text-left text-xs text-wabi-fg-muted">
        <input
          type="checkbox"
          name="consent"
          required
          disabled={pending}
          className="mt-0.5 size-3.5 shrink-0"
        />
        <span>
          신상품·소식 발송을 위한 이메일 수집에 동의합니다.{" "}
          <Link href="/legal/privacy" className="underline hover:text-wabi-fg">
            개인정보처리방침
          </Link>
        </span>
      </label>

      {state && (
        <p
          role="status"
          className={`mt-3 text-left text-xs ${
            state.ok ? "text-wabi-fg" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

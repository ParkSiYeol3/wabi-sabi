"use client";

import { useEffect } from "react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // 서버로 전송해 기록(0014) — client 에러는 브라우저 콘솔에만 남아 운영자가 못 봄.
    // 실패는 무시(로깅이 UX 를 막지 않음).
    void fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        digest: error.digest,
        message: error.message,
        url: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <Container className="flex flex-col items-center py-32 text-center">
      <h1 className="text-2xl font-semibold">문제가 발생했습니다</h1>
      <p className="mt-3 text-sm text-wabi-fg-muted">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button
        onClick={reset}
        className="mt-10 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90"
      >
        다시 시도
      </Button>
    </Container>
  );
}

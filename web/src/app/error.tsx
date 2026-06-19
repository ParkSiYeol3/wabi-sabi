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
    // TODO: 운영 단계에서 에러 로깅 서비스 연동
    console.error(error);
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

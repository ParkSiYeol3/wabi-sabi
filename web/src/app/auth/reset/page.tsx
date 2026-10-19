import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ResetPasswordForm } from "@/components/account/reset-password-form";

export const metadata: Metadata = { title: "새 비밀번호 정하기" };

// 재설정 메일의 링크(Supabase 템플릿: /auth/reset?token_hash=…)가 도착하는 곳.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash: tokenHash } = await searchParams;
  return (
    <Container className="flex justify-center py-20">
      <div className="w-full max-w-sm border border-wabi-border p-8">
        <h1 className="border-b border-wabi-border pb-3 text-center text-sm text-wabi-fg">
          새 비밀번호 정하기
        </h1>
        <div className="mt-8">
          {tokenHash ? (
            <ResetPasswordForm tokenHash={tokenHash} />
          ) : (
            <div className="space-y-3 text-sm leading-6">
              <p className="break-keep text-wabi-fg-muted">
                링크가 올바르지 않습니다. 메일의 버튼을 다시 눌러 주시거나, 비밀번호 찾기를
                다시 요청해 주세요.
              </p>
              <Link
                href="/auth/forgot"
                className="inline-block text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
              >
                비밀번호 찾기
              </Link>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

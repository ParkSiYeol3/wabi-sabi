import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ConfirmEmail } from "@/components/account/confirm-email";

export const metadata: Metadata = { title: "이메일 인증" };

// 가입 인증 메일의 링크(Supabase 템플릿: /auth/confirm#token_hash=…)가 도착하는 곳.
export default function ConfirmEmailPage() {
  return (
    <Container className="flex justify-center py-20">
      <div className="w-full max-w-sm border border-wabi-border p-8">
        <h1 className="border-b border-wabi-border pb-3 text-center text-sm text-wabi-fg">
          이메일 인증
        </h1>
        <div className="mt-8">
          <ConfirmEmail />
        </div>
      </div>
    </Container>
  );
}

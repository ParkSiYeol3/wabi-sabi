import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ResetPasswordForm } from "@/components/account/reset-password-form";

export const metadata: Metadata = { title: "새 비밀번호 정하기" };

// 재설정 메일의 링크(Supabase 템플릿: /auth/reset#token_hash=…)가 도착하는 곳.
// 토큰은 # 뒤에 있어 서버로 오지 않는다(요청 로그에 남지 않게) → 폼이 브라우저에서 읽는다.
export default function ResetPasswordPage() {
  return (
    <Container className="flex justify-center py-20">
      <div className="w-full max-w-sm border border-wabi-border p-8">
        <h1 className="border-b border-wabi-border pb-3 text-center text-sm text-wabi-fg">
          새 비밀번호 정하기
        </h1>
        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      </div>
    </Container>
  );
}

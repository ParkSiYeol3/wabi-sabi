import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";

export const metadata: Metadata = { title: "비밀번호 찾기" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <Container className="flex justify-center py-20">
      <div className="w-full max-w-sm border border-wabi-border p-8">
        <h1 className="border-b border-wabi-border pb-3 text-center text-sm text-wabi-fg">
          비밀번호 찾기
        </h1>
        <div className="mt-8">
          <ForgotPasswordForm expired={expired === "1"} />
        </div>
      </div>
    </Container>
  );
}

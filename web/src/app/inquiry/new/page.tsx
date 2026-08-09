import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/common/submit-button";
import { createClient } from "@/lib/supabase/server";
import { createInquiry } from "../actions";

export const metadata: Metadata = { title: "문의하기" };

export default async function NewInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // 로그인 필수
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/inquiry/new");

  const { error } = await searchParams;

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">문의하기</h1>

      {error === "rate" && (
        <p
          role="alert"
          className="mt-6 max-w-2xl border border-wabi-border bg-wabi-subtle px-4 py-3 text-sm"
        >
          문의를 너무 자주 등록했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <form action={createInquiry} className="mt-10 max-w-2xl space-y-4">
        <Input
          name="title"
          required
          aria-label="문의 제목"
          placeholder="제목"
          className="rounded-none"
        />
        <textarea
          name="body"
          required
          rows={8}
          aria-label="문의 내용"
          placeholder="문의 내용을 입력하세요"
          className="w-full border border-wabi-border bg-transparent px-3 py-2 text-base md:text-sm"
        />
        {/* 1:1 문의라 기본 비밀글(개인정보·주문 내용 보호). 공개 Q&A 를 원하면
            해제. 기본 공개면 체크를 놓친 손님의 본문이 누구에게나 노출된다. */}
        <label className="flex items-start gap-2 text-sm text-wabi-fg-muted">
          <input
            type="checkbox"
            name="is_secret"
            defaultChecked
            className="mt-0.5 size-4"
          />
          <span>
            비밀글 (작성자와 관리자만 볼 수 있습니다)
            <br />
            <span className="text-xs text-wabi-fg-muted/70">
              1:1 문의라 기본으로 켜 둡니다. 공개 질문을 원하시면 해제하세요.
            </span>
          </span>
        </label>
        <div className="flex gap-2">
          <SubmitButton
            styled
            pendingText="등록 중…"
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
          >
            등록
          </SubmitButton>
        </div>
      </form>
    </Container>
  );
}

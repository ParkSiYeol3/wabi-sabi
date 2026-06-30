import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createInquiry } from "../actions";

export const metadata: Metadata = { title: "문의하기" };

export default async function NewInquiryPage() {
  // 로그인 필수
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/inquiry/new");

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">문의하기</h1>

      <form action={createInquiry} className="mt-10 max-w-2xl space-y-4">
        <Input name="title" required placeholder="제목" className="rounded-none" />
        <textarea
          name="body"
          required
          rows={8}
          placeholder="문의 내용을 입력하세요"
          className="w-full border border-wabi-border bg-transparent px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-wabi-fg-muted">
          <input type="checkbox" name="is_secret" className="size-4" />
          비밀글 (작성자와 관리자만 볼 수 있습니다)
        </label>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
          >
            등록
          </Button>
        </div>
      </form>
    </Container>
  );
}

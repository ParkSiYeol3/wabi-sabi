"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// 입력 스키마 (Zod 3차) — 공개 엔드포인트, 초대형 문자열 차단.
const inquirySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5_000),
});

// 문의 작성 — 로그인 사용자만 (RLS with check auth.uid()=user_id).
export async function createInquiry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/inquiry/new");

  const parsed = inquirySchema.safeParse({
    title: String(formData.get("title") || ""),
    body: String(formData.get("body") || ""),
  });
  if (!parsed.success) return;
  const { title, body } = parsed.data;
  const isSecret = formData.get("is_secret") === "on";

  // 사용자당 시간 5건 — 게시판 도배 차단. 키가 user.id 라 IP 우회가 통하지 않는다.
  const { ok } = await rateLimit(`inquiry:${user.id}`, 5, 3_600);
  if (!ok) redirect("/inquiry/new?error=rate");

  await supabase.from("inquiries").insert({
    user_id: user.id,
    title,
    body,
    is_secret: isSecret,
  });
  revalidatePath("/inquiry");
  redirect("/inquiry");
}

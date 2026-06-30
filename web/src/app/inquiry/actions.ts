"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 문의 작성 — 로그인 사용자만 (RLS with check auth.uid()=user_id).
export async function createInquiry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/inquiry/new");

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const isSecret = formData.get("is_secret") === "on";
  if (!title || !body) return;

  await supabase.from("inquiries").insert({
    user_id: user.id,
    title,
    body,
    is_secret: isSecret,
  });
  revalidatePath("/inquiry");
  redirect("/inquiry");
}

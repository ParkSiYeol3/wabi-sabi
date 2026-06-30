"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 리뷰 작성 — 로그인 사용자만 (RLS with check auth.uid()=user_id). 상품당 1인 1리뷰.
export async function createReview(formData: FormData) {
  const productId = String(formData.get("product_id") || "");
  if (!productId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/shop/${productId}`);

  const rating = Number(formData.get("rating") || 0);
  const body = String(formData.get("body") || "").trim();
  if (rating < 1 || rating > 5 || !body) return;

  // 작성자명 스냅샷: profile.name > 이메일 로컬파트 > "익명"
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  const authorName =
    profile?.name?.trim() || user.email?.split("@")[0] || "익명";

  // unique(product_id,user_id) 충돌 시 무시(이미 작성).
  await supabase.from("reviews").insert({
    product_id: productId,
    user_id: user.id,
    author_name: authorName,
    rating,
    body,
  });
  revalidatePath(`/shop/${productId}`);
  revalidatePath("/review");
}

// 리뷰 삭제 — 본인만 (RLS delete using auth.uid()=user_id).
export async function deleteReview(formData: FormData) {
  const id = String(formData.get("id") || "");
  const productId = String(formData.get("product_id") || "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("reviews").delete().eq("id", id).eq("user_id", user.id);
  if (productId) revalidatePath(`/shop/${productId}`);
  revalidatePath("/review");
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPurchased } from "@/lib/queries/reviews";
import { parseUuid } from "@/lib/validation";

// 입력 스키마 (Zod 3차) — rating 정수 강제(소수·범위 밖 차단), 본문 길이 제한.
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(2_000),
});

// 리뷰 작성 — 로그인 사용자만 (RLS with check auth.uid()=user_id). 상품당 1인 1리뷰.
export async function createReview(formData: FormData) {
  const productId = parseUuid(formData.get("product_id"));
  if (!productId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/shop/${productId}`);

  const parsed = reviewSchema.safeParse({
    rating: Number(formData.get("rating") || 0),
    body: String(formData.get("body") || ""),
  });
  if (!parsed.success) return;
  const { rating, body } = parsed.data;

  // 구매자만 리뷰를 쓸 수 있다 (#126) — UI 에서 폼을 숨기는 것만으론 막을 수 없다.
  // 폼은 서버 액션이라 직접 호출이 가능하므로 서버에서 반드시 재검증한다.
  if (!(await hasPurchased(productId))) return;

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
  const id = parseUuid(formData.get("id"));
  const productId = parseUuid(formData.get("product_id"));
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

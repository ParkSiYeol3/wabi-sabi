"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseUuid } from "@/lib/validation";

// 재입고 알림 구독/취소 (#166) — 로그인 사용자 본인만(RLS insert/delete own).
// 상품당 1건(unique) — 중복 신청은 조용히 무시된다.

export async function subscribeRestock(formData: FormData) {
  const productId = parseUuid(formData.get("product_id"));
  if (!productId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/shop/${productId}`);

  await supabase
    .from("restock_subscriptions")
    .insert({ product_id: productId, user_id: user.id });
  revalidatePath(`/shop/${productId}`);
}

export async function unsubscribeRestock(formData: FormData) {
  const productId = parseUuid(formData.get("product_id"));
  if (!productId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("restock_subscriptions")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", user.id);
  revalidatePath(`/shop/${productId}`);
}

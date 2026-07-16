"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseUuid } from "@/lib/validation";

// 재입고 알림 구독/취소 (#166) — 로그인 사용자 본인만(RLS insert/delete own).
// 상품당 1건(unique) — 중복 신청은 조용히 무시된다.

// 결과를 boolean 으로 돌려준다 — 실패(RLS·제약·네트워크)를 무시하면 버튼만 구독된
// 것처럼 바뀌어 사용자가 알림을 받는다고 오해한다.
const UNIQUE_VIOLATION = "23505";

export async function subscribeRestock(formData: FormData): Promise<boolean> {
  const productId = parseUuid(formData.get("product_id"));
  if (!productId) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/shop/${productId}`);

  const { error } = await supabase
    .from("restock_subscriptions")
    .insert({ product_id: productId, user_id: user.id });
  // 이미 구독 중(unique 위반)은 실패가 아니라 목표 상태 달성으로 본다.
  const ok = !error || error.code === UNIQUE_VIOLATION;
  if (ok) revalidatePath(`/shop/${productId}`);
  return ok;
}

export async function unsubscribeRestock(formData: FormData): Promise<boolean> {
  const productId = parseUuid(formData.get("product_id"));
  if (!productId) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("restock_subscriptions")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", user.id);
  if (error) return false;
  revalidatePath(`/shop/${productId}`);
  return true;
}

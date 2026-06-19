"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// WSB-004: 내 정보·배송지 변경 (RLS가 본인 데이터만 허용).

export async function updateName(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ name }).eq("id", user.id);
  revalidatePath("/mypage");
}

export async function addAddress(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const recipient = String(formData.get("recipient") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const detail = String(formData.get("detail") || "").trim();
  const postcode = String(formData.get("postcode") || "").trim();
  if (!recipient || !phone || !address) return;

  await supabase.from("addresses").insert({
    user_id: user.id,
    recipient,
    phone,
    address,
    detail: detail || null,
    postcode: postcode || null,
  });
  revalidatePath("/mypage");
}

export async function deleteAddress(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS가 본인 것만 삭제 허용하지만 명시적으로도 user_id 조건
  await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/mypage");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export async function answerInquiry(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const answer = String(formData.get("answer") || "").trim();
  if (!id || !answer) return;

  const supabase = createAdminClient();
  await supabase
    .from("inquiries")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/inquiries");
  revalidatePath(`/inquiry/${id}`);
  revalidatePath("/inquiry");
}

export async function deleteInquiry(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/inquiries");
  revalidatePath("/inquiry");
}

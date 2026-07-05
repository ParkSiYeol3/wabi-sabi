"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";

export async function answerInquiry(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const answer = String(formData.get("answer") || "").trim().slice(0, 5_000);
  if (!id || !answer) return;

  const supabase = createAdminClient();
  await supabase
    .from("inquiries")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", id);
  await logAdminAction(user, {
    action: "inquiry.answer",
    targetTable: "inquiries",
    targetId: id,
  });
  revalidatePath("/admin/inquiries");
  revalidatePath(`/inquiry/${id}`);
  revalidatePath("/inquiry");
}

export async function deleteInquiry(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("inquiries").delete().eq("id", id);
  await logAdminAction(user, {
    action: "inquiry.delete",
    targetTable: "inquiries",
    targetId: id,
  });
  revalidatePath("/admin/inquiries");
  revalidatePath("/inquiry");
}

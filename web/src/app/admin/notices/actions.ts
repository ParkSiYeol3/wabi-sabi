"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export async function createNotice(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return;

  const supabase = createAdminClient();
  await supabase.from("notices").insert({ title, body });
  revalidatePath("/admin/notices");
  revalidatePath("/notice");
}

export async function deleteNotice(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("notices").delete().eq("id", id);
  revalidatePath("/admin/notices");
  revalidatePath("/notice");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";

export async function createNotice(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim().slice(0, 10_000);
  if (!title || !body) return;

  const supabase = createAdminClient();
  const { data: inserted } = await supabase
    .from("notices")
    .insert({ title, body })
    .select("id")
    .single();
  await logAdminAction(user, {
    action: "notice.create",
    targetTable: "notices",
    targetId: inserted?.id ?? null,
    meta: { title },
  });
  revalidatePath("/admin/notices");
  revalidatePath("/notice");
}

export async function deleteNotice(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("notices").delete().eq("id", id);
  await logAdminAction(user, {
    action: "notice.delete",
    targetTable: "notices",
    targetId: id,
  });
  revalidatePath("/admin/notices");
  revalidatePath("/notice");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";

// 송장번호 입력 + 상태 배송중 전환
export async function setTracking(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const tracking = String(formData.get("tracking_number") || "")
    .trim()
    .slice(0, 100);
  if (!id) return;

  const supabase = createAdminClient();
  await supabase
    .from("orders")
    .update({
      tracking_number: tracking || null,
      status: tracking ? "shipping" : "paid",
    })
    .eq("id", id);
  revalidatePath("/admin/orders");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export async function createProduct(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const stock = Number(formData.get("stock") || 0);
  const categoryId = String(formData.get("category_id") || "") || null;
  const isMonthly = formData.get("is_monthly") === "on";
  if (!name || price < 0) return;

  const supabase = createAdminClient();
  await supabase.from("products").insert({
    name,
    price,
    stock,
    category_id: categoryId,
    is_monthly: isMonthly,
  });
  revalidatePath("/admin/products");
}

export async function toggleMonthly(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const monthly = String(formData.get("is_monthly")) === "true";
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ is_monthly: !monthly }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function updateStock(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const stock = Number(formData.get("stock") || 0);
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ stock }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function toggleActive(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const active = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ is_active: !active }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
}

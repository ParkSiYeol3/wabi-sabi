"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  uploadProductImages,
  deleteProductImage,
} from "@/lib/storage";

function imageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

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
  const { data: inserted } = await supabase
    .from("products")
    .insert({
      name,
      price,
      stock,
      category_id: categoryId,
      is_monthly: isMonthly,
    })
    .select("id")
    .single();

  // 이미지 업로드 → images 배열 저장
  const files = imageFiles(formData);
  if (inserted && files.length) {
    const urls = await uploadProductImages(inserted.id, files);
    if (urls.length) {
      await supabase.from("products").update({ images: urls }).eq("id", inserted.id);
    }
  }
  revalidatePath("/admin/products");
}

// 기존 상품에 이미지 추가 (기존 배열 뒤에 append).
export async function addProductImages(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const files = imageFiles(formData);
  if (!id || !files.length) return;

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();
  const current: string[] = Array.isArray(product?.images)
    ? (product!.images as string[])
    : [];

  const urls = await uploadProductImages(id, files);
  if (urls.length) {
    await supabase
      .from("products")
      .update({ images: [...current, ...urls] })
      .eq("id", id);
  }
  revalidatePath("/admin/products");
  revalidatePath(`/shop/${id}`);
}

// 상품 이미지 1개 삭제 (배열에서 제거 + 스토리지 삭제).
export async function removeProductImage(formData: FormData) {
  await requireAdmin();
  if (!adminConfigured()) return;

  const id = String(formData.get("id") || "");
  const url = String(formData.get("url") || "");
  if (!id || !url) return;

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();
  const current: string[] = Array.isArray(product?.images)
    ? (product!.images as string[])
    : [];

  await supabase
    .from("products")
    .update({ images: current.filter((u) => u !== url) })
    .eq("id", id);
  await deleteProductImage(url);
  revalidatePath("/admin/products");
  revalidatePath(`/shop/${id}`);
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

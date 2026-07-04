"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  uploadProductImages,
  deleteProductImage,
} from "@/lib/storage";
import type { ActionResult } from "./types";

function imageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

function failureText(failures: { name: string; reason: string }[]): string {
  return failures.map((f) => `${f.name}(${f.reason})`).join(", ");
}

// 새 상품 등록 — useActionState 시그니처. 실패 시 폼 값 유지를 위해 결과 반환.
export async function createProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const stock = Number(formData.get("stock") || 0);
  const categoryId = String(formData.get("category_id") || "") || null;
  const isMonthly = formData.get("is_monthly") === "on";
  if (!name || Number.isNaN(price) || price < 0)
    return { ok: false, message: "상품명과 가격을 확인해주세요." };

  const supabase = createAdminClient();
  const { data: inserted, error: insertError } = await supabase
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
  if (insertError || !inserted)
    return { ok: false, message: `등록 실패: ${insertError?.message ?? "알 수 없는 오류"}` };

  // 이미지 업로드 → images 배열 저장. 실패는 메시지로 노출(조용히 넘기지 않음).
  const files = imageFiles(formData);
  let message = `'${name}' 등록 완료`;
  if (files.length) {
    const { urls, failures } = await uploadProductImages(inserted.id, files);
    if (urls.length) {
      await supabase
        .from("products")
        .update({ images: urls })
        .eq("id", inserted.id);
      message += ` (이미지 ${urls.length}장)`;
    }
    if (failures.length) {
      message += ` — ⚠ 이미지 업로드 실패: ${failureText(failures)}. 목록에서 '이미지 추가'로 다시 시도하세요.`;
    }
  }
  revalidatePath("/admin/products");
  return { ok: true, message };
}

// 기존 상품에 이미지 추가 (기존 배열 뒤에 append) — useActionState 시그니처.
export async function addProductImages(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const id = String(formData.get("id") || "");
  const files = imageFiles(formData);
  if (!id) return { ok: false, message: "잘못된 요청" };
  if (!files.length) return { ok: false, message: "파일을 먼저 선택하세요." };

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();
  const current: string[] = Array.isArray(product?.images)
    ? (product!.images as string[])
    : [];

  const { urls, failures } = await uploadProductImages(id, files);
  if (urls.length) {
    await supabase
      .from("products")
      .update({ images: [...current, ...urls] })
      .eq("id", id);
  }
  revalidatePath("/admin/products");
  revalidatePath(`/shop/${id}`);

  if (failures.length)
    return {
      ok: urls.length > 0,
      message: `${urls.length}장 업로드, 실패: ${failureText(failures)}`,
    };
  return { ok: true, message: `이미지 ${urls.length}장 추가됨` };
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

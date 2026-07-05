"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid, numField, uuidSchema } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import {
  uploadProductImages,
  deleteProductImage,
} from "@/lib/storage";
import type { ActionResult } from "./types";

// 상품 입력 검증 — 음수 stock 은 재고 검증(0010)을 무력화하므로 특히 차단.
const stockSchema = z.number().int().min(0).max(1_000_000);
const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(100_000_000),
  stock: stockSchema,
  categoryId: uuidSchema.nullable(),
  isMonthly: z.boolean(),
});

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
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const parsed = productSchema.safeParse({
    name: String(formData.get("name") || "").trim(),
    price: numField(formData.get("price")),
    stock: numField(formData.get("stock")),
    categoryId: String(formData.get("category_id") || "") || null,
    isMonthly: formData.get("is_monthly") === "on",
  });
  if (!parsed.success)
    return {
      ok: false,
      message: "상품명·가격·재고를 확인해주세요. (가격·재고는 0 이상 정수)",
    };
  const { name, price, stock, categoryId, isMonthly } = parsed.data;

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
  await logAdminAction(user, {
    action: "product.create",
    targetTable: "products",
    targetId: inserted.id,
    meta: { name, price, stock },
  });
  revalidatePath("/admin/products");
  return { ok: true, message };
}

// 기존 상품에 이미지 추가 (기존 배열 뒤에 append) — useActionState 시그니처.
export async function addProductImages(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const id = parseUuid(formData.get("id"));
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
  if (urls.length)
    await logAdminAction(user, {
      action: "product.add_images",
      targetTable: "products",
      targetId: id,
      meta: { count: urls.length },
    });
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

  const user = await requireAdmin();
  const id = parseUuid(formData.get("id"));
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
  await logAdminAction(user, {
    action: "product.remove_image",
    targetTable: "products",
    targetId: id,
    meta: { url },
  });
  revalidatePath("/admin/products");
  revalidatePath(`/shop/${id}`);
}

export async function toggleMonthly(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const monthly = String(formData.get("is_monthly")) === "true";
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ is_monthly: !monthly }).eq("id", id);
  await logAdminAction(user, {
    action: "product.toggle_monthly",
    targetTable: "products",
    targetId: id,
    meta: { is_monthly: !monthly },
  });
  revalidatePath("/admin/products");
}

export async function updateStock(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const parsedStock = stockSchema.safeParse(numField(formData.get("stock")));
  if (!id || !parsedStock.success) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ stock: parsedStock.data }).eq("id", id);
  await logAdminAction(user, {
    action: "product.update_stock",
    targetTable: "products",
    targetId: id,
    meta: { stock: parsedStock.data },
  });
  revalidatePath("/admin/products");
}

export async function toggleActive(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const active = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ is_active: !active }).eq("id", id);
  await logAdminAction(user, {
    action: "product.toggle_active",
    targetTable: "products",
    targetId: id,
    meta: { is_active: !active },
  });
  revalidatePath("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").delete().eq("id", id);
  await logAdminAction(user, {
    action: "product.delete",
    targetTable: "products",
    targetId: id,
  });
  revalidatePath("/admin/products");
}

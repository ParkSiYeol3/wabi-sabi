"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid, numField, uuidSchema } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import { sendRestockMails } from "@/lib/emails/restock";
import { parseOptionGroups } from "@/lib/product-options";
import { ADDON_CODES } from "@/lib/addons";
import {
  uploadProductImages,
  deleteProductImage,
} from "@/lib/storage";
import type { ActionResult } from "./types";

// 상품 입력 검증 — 음수 stock 은 재고 검증(0010)을 무력화하므로 특히 차단.
const stockSchema = z.number().int().min(0).max(1_000_000);
// 등록·수정이 공유하는 본문 필드. stock 은 등록에만 — 수정은 목록의 재고 저장
// 경로(updateStock)로 일원화한다(재입고 알림 판정이 거기 있음, #166).
const productFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(100_000_000),
  categoryId: uuidSchema.nullable(),
  isMonthly: z.boolean(),
  // 상품 설명 — 상세 페이지에 노출된다. 비우면 null(설명 없이 렌더).
  description: z.string().trim().max(2000).nullable(),
  // 상세 스펙(소재·사이즈·주의·원산지 0035) — 비우면 null(표시 생략).
  material: z.string().trim().max(500).nullable(),
  size: z.string().trim().max(500).nullable(),
  // 주의사항은 복수 선택 " · " 조인이라 여유롭게(대표님).
  care: z.string().trim().max(1000).nullable(),
  origin: z.string().trim().max(120).nullable(),
});
const productSchema = productFieldsSchema.extend({ stock: stockSchema });

// FormData → 본문 필드 파싱(등록·수정 공용). 빈 문자열은 null 로.
function productFields(formData: FormData) {
  const text = (key: string) => String(formData.get(key) || "").trim() || null;
  return {
    name: String(formData.get("name") || "").trim(),
    price: numField(formData.get("price")),
    categoryId: String(formData.get("category_id") || "") || null,
    isMonthly: formData.get("is_monthly") === "on",
    description: text("description"),
    material: text("material"),
    size: text("size"),
    care: text("care"),
    origin: text("origin"),
  };
}

// 커스텀 옵션(0048) — hidden `options`(JSON)를 안전 파싱. 깨진 JSON 은 빈 배열.
function optionsField(formData: FormData) {
  try {
    return parseOptionGroups(JSON.parse(String(formData.get("options") || "[]")));
  } catch {
    return [];
  }
}
// 노출 추가옵션(0048) — 체크된 코드만. 유효 코드로 정규화하고 ADDONS 순서를 따른다.
function enabledAddonsField(formData: FormData): string[] {
  const picked = new Set(formData.getAll("enabled_addons").map((c) => String(c)));
  return ADDON_CODES.filter((c) => picked.has(c));
}

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
    ...productFields(formData),
    stock: numField(formData.get("stock")),
  });
  if (!parsed.success)
    return {
      ok: false,
      message: "상품명·가격·재고를 확인해주세요. (가격·재고는 0 이상 정수)",
    };
  const {
    name,
    price,
    stock,
    categoryId,
    isMonthly,
    description,
    material,
    size,
    care,
    origin,
  } = parsed.data;

  const supabase = createAdminClient();
  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert({
      name,
      price,
      stock,
      category_id: categoryId,
      is_monthly: isMonthly,
      description,
      material,
      size,
      care,
      origin,
      options: optionsField(formData),
      enabled_addons: enabledAddonsField(formData),
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
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  return { ok: true, message };
}

// 기존 상품 본문 수정 (대표님 지시 — 이미 올린 상품 글 수정). 재고는 목록의
// updateStock(재입고 알림 경로), 이미지는 목록의 추가/삭제가 담당 — 여기선 제외.
export async function updateProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const id = parseUuid(formData.get("id"));
  if (!id) return { ok: false, message: "잘못된 요청" };

  const parsed = productFieldsSchema.safeParse(productFields(formData));
  if (!parsed.success)
    return { ok: false, message: "상품명·가격을 확인해주세요. (가격은 0 이상 정수)" };
  const {
    name,
    price,
    categoryId,
    isMonthly,
    description,
    material,
    size,
    care,
    origin,
  } = parsed.data;

  const supabase = createAdminClient();
  // select 로 매칭 row 를 돌려받아 부재(동시 삭제 등)를 성공으로 오인하지 않는다.
  const { data: updated, error } = await supabase
    .from("products")
    .update({
      name,
      price,
      category_id: categoryId,
      is_monthly: isMonthly,
      description,
      material,
      size,
      care,
      origin,
      options: optionsField(formData),
      enabled_addons: enabledAddonsField(formData),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: `저장 실패: ${error.message}` };
  if (!updated)
    return { ok: false, message: "상품을 찾을 수 없습니다(이미 삭제되었을 수 있음)." };

  await logAdminAction(user, {
    action: "product.update",
    targetTable: "products",
    targetId: id,
    meta: { name, price, category_id: categoryId },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  revalidatePath(`/shop/${id}`); // 상세 캐시(#181) 무효화
  return { ok: true, message: "저장되었습니다." };
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
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
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
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  revalidatePath(`/shop/${id}`);
}

// 상품 이미지 순서 이동 (배열 스왑) — 상세 페이지 스캐터 위치는 images 배열 순서로
// 결정되므로(첫 장=대표 히어로, 이후가 순서대로 불규칙 슬롯), 대표님이 사진 위치를
// 의도해 배치할 수 있게 한 칸씩 앞(left)/뒤(right)로 옮긴다. url 이 중복될 수 있어
// 제거와 달리 인덱스 기반으로 스왑한다.
export async function moveProductImage(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const from = Number(formData.get("from"));
  const dir = String(formData.get("dir") || ""); // "left" | "right"
  if (!id || !Number.isInteger(from) || (dir !== "left" && dir !== "right")) return;

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();
  const current: string[] = Array.isArray(product?.images)
    ? (product!.images as string[])
    : [];

  const to = dir === "left" ? from - 1 : from + 1;
  // 범위 밖(끝단에서 더 못 감)이면 조용히 무시.
  if (from < 0 || from >= current.length || to < 0 || to >= current.length) return;

  const next = [...current];
  [next[from], next[to]] = [next[to], next[from]];
  await supabase.from("products").update({ images: next }).eq("id", id);
  await logAdminAction(user, {
    action: "product.move_image",
    targetTable: "products",
    targetId: id,
    meta: { from, to },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
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
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
}

export async function updateStock(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const parsedStock = stockSchema.safeParse(numField(formData.get("stock")));
  if (!id || !parsedStock.success) return;

  const supabase = createAdminClient();
  // 재입고 판정을 위해 이전 재고를 먼저 읽는다 (#166).
  const { data: before } = await supabase
    .from("products")
    .select("stock")
    .eq("id", id)
    .maybeSingle<{ stock: number }>();

  // 저장이 실패하면 감사로그·알림을 남기지 않는다(하지 않은 변경을 기록·통지하지 않도록).
  const { error: updateErr } = await supabase
    .from("products")
    .update({ stock: parsedStock.data })
    .eq("id", id);
  if (updateErr) {
    console.error("[admin] 재고 저장 실패", id, updateErr);
    return;
  }

  await logAdminAction(user, {
    action: "product.update_stock",
    targetTable: "products",
    targetId: id,
    meta: { stock: parsedStock.data },
  });

  // 품절 → 재입고로 바뀐 순간에만 구독자에게 알림(1회성). 발송 실패는 삼켜
  // 재고 저장을 되돌리지 않는다 — 메일은 부가 기능(fail-open).
  if (before?.stock === 0 && parsedStock.data > 0) {
    try {
      await sendRestockMails(id);
    } catch (e) {
      console.error("[restock] 알림 발송 실패", id, e);
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  revalidatePath(`/shop/${id}`);
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
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  revalidatePath(`/shop/${id}`); // 상세 캐시(#181) 무효화 — 비활성 즉시 반영
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
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  revalidatePath(`/shop/${id}`); // 상세 캐시(#181) 무효화 — 삭제 즉시 404
}

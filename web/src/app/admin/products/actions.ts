"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// 옵션 값별 재고(0058) — hidden `option_stock`(JSON `{group, stocks:{값:수량}}`)를
// 안전 파싱. group 이 지정된 옵션 그룹의 값마다 재고를 둔다. products.stock 은
// 관리 상품에선 이 합으로 유지(대시보드·품절 판정 호환). 깨진/빈 입력은 미관리.
function optionStockField(formData: FormData): {
  stockOption: string | null;
  rows: { value: string; stock: number }[];
  sum: number;
} {
  try {
    const raw = JSON.parse(String(formData.get("option_stock") || "null"));
    const group = typeof raw?.group === "string" ? raw.group.trim() : "";
    const stocks =
      raw?.stocks && typeof raw.stocks === "object" ? raw.stocks : null;
    if (!group || !stocks) return { stockOption: null, rows: [], sum: 0 };
    const rows: { value: string; stock: number }[] = [];
    for (const [value, n] of Object.entries(stocks)) {
      const v = String(value).trim().slice(0, 60);
      const s = Math.max(0, Math.min(1_000_000, Math.floor(Number(n) || 0)));
      if (v) rows.push({ value: v, stock: s });
    }
    if (rows.length === 0) return { stockOption: null, rows: [], sum: 0 };
    return {
      stockOption: group.slice(0, 40),
      rows,
      sum: rows.reduce((a, r) => a + r.stock, 0),
    };
  } catch {
    return { stockOption: null, rows: [], sum: 0 };
  }
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

  // 옵션 값별 재고(0058) — 관리면 products.stock 은 값별 합, stock_option 지정.
  const optStock = optionStockField(formData);

  const supabase = createAdminClient();
  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert({
      name,
      price,
      stock: optStock.stockOption ? optStock.sum : stock,
      stock_option: optStock.stockOption,
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

  // 값별 재고 행 저장(관리 상품).
  if (optStock.stockOption && optStock.rows.length) {
    await supabase.from("product_option_stock").insert(
      optStock.rows.map((r) => ({
        product_id: inserted.id,
        value: r.value,
        stock: r.stock,
      })),
    );
  }

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

  // 옵션 값별 재고(0058) — 관리면 stock_option 지정·stock 을 합으로, 미관리면 null.
  const optStock = optionStockField(formData);

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
      stock_option: optStock.stockOption,
      // 관리 상품이면 flat stock 을 값별 합으로 맞춘다(미관리면 기존 stock 유지 —
      // 본문 수정 폼은 flat 재고를 편집하지 않으므로 건드리지 않는다).
      ...(optStock.stockOption ? { stock: optStock.sum } : {}),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: `저장 실패: ${error.message}` };
  if (!updated)
    return { ok: false, message: "상품을 찾을 수 없습니다(이미 삭제되었을 수 있음)." };

  // 값별 재고 행 동기화 — 관리면 교체(전량 삭제 후 재삽입), 미관리면 정리.
  await supabase.from("product_option_stock").delete().eq("product_id", id);
  if (optStock.stockOption && optStock.rows.length) {
    await supabase.from("product_option_stock").insert(
      optStock.rows.map((r) => ({
        product_id: id,
        value: r.value,
        stock: r.stock,
      })),
    );
  }

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

// 이미지 순서 일괄 저장(대표님 — 드래그로 재배치). order 는 현재 이미지 URL 을
// 새 순서로 나열한 JSON 배열. 현재 이미지 집합과 정확히 일치(같은 원소·개수)할
// 때만 반영한다 — 임의 URL 주입·유실을 막는다. 첫 장이 대표(히어로·목록 썸네일).
export async function reorderProductImages(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;
  let order: unknown;
  try {
    order = JSON.parse(String(formData.get("order") || "[]"));
  } catch {
    return;
  }
  if (!Array.isArray(order) || order.some((u) => typeof u !== "string")) return;
  const next = order as string[];

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();
  const current: string[] = Array.isArray(product?.images)
    ? (product!.images as string[])
    : [];

  // 순열 검증 — 개수 같고, 정렬 후 완전히 일치해야 반영(집합 보존).
  if (
    next.length !== current.length ||
    [...next].sort().join(" ") !== [...current].sort().join(" ")
  )
    return;

  await supabase.from("products").update({ images: next }).eq("id", id);
  await logAdminAction(user, {
    action: "product.reorder_images",
    targetTable: "products",
    targetId: id,
    meta: { count: next.length },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
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

// 기존 상품 이미지 1장 교체 (편집본으로) — 대표님: 이미 올린 상품 사진도 편집 가능하게.
// 클라(ImageEditor)가 크롭·회전·필터한 파일을 배열 index 위치에 덮어쓰고(순서 유지),
// 기존 스토리지 객체는 삭제한다. index 만 믿지 않고 url 을 함께 받아, 그 사이 재정렬로
// 다른 장을 덮어쓰는 사고를 막는다(현재 index 의 url 이 일치할 때만 진행).
export async function replaceProductImage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const id = parseUuid(formData.get("id"));
  const index = Number(formData.get("index"));
  const oldUrl = String(formData.get("url") || "");
  const file = formData
    .getAll("image")
    .find((f): f is File => f instanceof File && f.size > 0);
  if (!id || !Number.isInteger(index) || index < 0 || !oldUrl)
    return { ok: false, message: "잘못된 요청" };
  if (!file) return { ok: false, message: "편집된 이미지가 없습니다." };

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();
  const current: string[] = Array.isArray(product?.images)
    ? (product!.images as string[])
    : [];
  if (index >= current.length || current[index] !== oldUrl)
    return {
      ok: false,
      message: "목록이 변경되었습니다. 새로고침 후 다시 시도하세요.",
    };

  const { urls, failures } = await uploadProductImages(id, [file]);
  if (!urls.length)
    return { ok: false, message: `교체 실패: ${failureText(failures)}` };

  const next = [...current];
  next[index] = urls[0];
  await supabase.from("products").update({ images: next }).eq("id", id);
  // 교체가 저장된 뒤에 옛 객체 삭제(먼저 지웠다가 저장 실패 시 원본 유실 방지).
  await deleteProductImage(oldUrl);
  await logAdminAction(user, {
    action: "product.replace_image",
    targetTable: "products",
    targetId: id,
    meta: { index },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  return { ok: true, message: "사진을 교체했습니다." };
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
    .select("stock, stock_option")
    .eq("id", id)
    .maybeSingle<{ stock: number; stock_option: string | null }>();

  // 옵션 값별 재고 관리 상품(0058)은 목록 인라인 재고 편집을 막는다 — flat stock 은
  // 값별 합으로 자동 유지되므로, 여기서 덮어쓰면 값별 재고와 어긋난다. 값별 재고는
  // 상품 수정 폼에서 관리한다.
  if (before?.stock_option) {
    console.warn("[admin] 옵션 재고 관리 상품은 인라인 재고 편집 불가", id);
    return;
  }

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

// 판매 상태 3종(대표님 — 공개/비공개/품절 버튼). 재고 수량은 건드리지 않는다.
//   · public  = is_active=true,  sold_out=false  (정상 판매)
//   · private = is_active=false, sold_out=false  (손님 화면·검색·구매 전면 차단)
//   · soldout = is_active=true,  sold_out=true   (노출은 하되 구매 불가·Out of Stock)
// 저장된 재고와 무관하게 품절 표시가 가능해, 재고 데이터를 보존한 채 판매만 잠근다.
const SALE_STATUS = {
  public: { is_active: true, sold_out: false },
  private: { is_active: false, sold_out: false },
  soldout: { is_active: true, sold_out: true },
} as const;
type SaleStatus = keyof typeof SALE_STATUS;

export async function setSaleStatus(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const status = String(formData.get("status")) as SaleStatus;
  if (!id || !(status in SALE_STATUS)) return;

  const next = SALE_STATUS[status];
  const supabase = createAdminClient();
  await supabase.from("products").update(next).eq("id", id);
  await logAdminAction(user, {
    action: "product.set_sale_status",
    targetTable: "products",
    targetId: id,
    meta: { status, ...next },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop"); // 상품 목록 탐색 캐시(#185) 무효화
  revalidatePath(`/shop/${id}`); // 상세 캐시(#181) 무효화 — 상태 즉시 반영
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
  // 수정 페이지에서 삭제하면 현재 상품 경로는 사라지므로 목록으로 돌려보낸다.
  redirect("/admin/products");
}

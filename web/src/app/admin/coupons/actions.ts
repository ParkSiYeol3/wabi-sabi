"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";

export type CouponActionResult = { ok: boolean; message: string };

// 쿠폰 코드 — 영문 대문자·숫자·하이픈. 저장 시 대문자로 정규화.
const schema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "코드는 영문·숫자·하이픈만"),
  description: z.string().trim().max(100).optional(),
  discountType: z.enum(["fixed", "percent"]),
  discountValue: z.number().int().min(1).max(10_000_000),
  minOrder: z.number().int().min(0).max(10_000_000).default(0),
  maxDiscount: z.number().int().min(1).max(10_000_000).optional(),
  expiresAt: z.string().trim().optional(),
  maxUses: z.number().int().min(0).max(1_000_000).optional(),
  perUserLimit: z.number().int().min(1).max(100).default(1),
  autoIssueSignup: z.boolean().default(false),
});

function num(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function createCoupon(
  _prev: CouponActionResult | null,
  formData: FormData,
): Promise<CouponActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };

  const parsed = schema.safeParse({
    code: String(formData.get("code") || ""),
    description: String(formData.get("description") || "").trim() || undefined,
    discountType: String(formData.get("discount_type") || "fixed"),
    discountValue: num(formData.get("discount_value")),
    minOrder: num(formData.get("min_order")) ?? 0,
    maxDiscount: num(formData.get("max_discount")),
    expiresAt: String(formData.get("expires_at") || "").trim() || undefined,
    maxUses: num(formData.get("max_uses")),
    perUserLimit: num(formData.get("per_user_limit")) ?? 1,
    autoIssueSignup: formData.get("auto_issue_signup") === "on",
  });
  if (!parsed.success)
    return { ok: false, message: "입력값을 확인해주세요. (코드·할인값 필수)" };
  const d = parsed.data;

  // percent 는 1~100 으로 제한(값 오입력 방지).
  if (d.discountType === "percent" && d.discountValue > 100)
    return { ok: false, message: "퍼센트 할인은 1~100 사이여야 합니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").insert({
    code: d.code.toUpperCase(),
    description: d.description ?? null,
    discount_type: d.discountType,
    discount_value: d.discountValue,
    min_order: d.minOrder,
    max_discount: d.discountType === "percent" ? d.maxDiscount ?? null : null,
    // datetime-local → timestamptz(로컬 시각 그대로). 미입력이면 무기한.
    expires_at: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
    max_uses: d.maxUses ?? null,
    per_user_limit: d.perUserLimit,
    auto_issue_signup: d.autoIssueSignup,
  });
  if (error)
    return {
      ok: false,
      message: error.message.includes("duplicate")
        ? "이미 존재하는 코드입니다."
        : `등록 실패: ${error.message}`,
    };

  await logAdminAction(user, {
    action: "coupon.create",
    targetTable: "coupons",
    meta: { code: d.code.toUpperCase(), type: d.discountType, value: d.discountValue },
  });
  revalidatePath("/admin/coupons");
  return { ok: true, message: `쿠폰 '${d.code.toUpperCase()}' 등록 완료` };
}

// 활성/비활성 토글 — 비활성 쿠폰은 발급·사용 불가(체크아웃 검증에서 걸린다).
export async function setCouponActive(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: active })
    .eq("id", id);
  if (error) {
    console.error("[admin] 쿠폰 상태 변경 실패", id, error);
    return;
  }
  await logAdminAction(user, {
    action: "coupon.set_active",
    targetTable: "coupons",
    targetId: id,
    meta: { is_active: active },
  });
  revalidatePath("/admin/coupons");
}

// 쿠폰 삭제(대표님 — 오입력·테스트 쿠폰 정리). 이미 사용된 쿠폰은 삭제하지 않는다:
// 주문(orders.coupon_id)이 참조하고 있으면 주문 기록 정합성이 깨지고, DB FK(RESTRICT)
// 도 삭제를 막는다. 사용 이력이 있으면 '비활성화'로 유도한다(is_active=false 로 이미
// 발급·사용이 전면 차단됨). 미사용 쿠폰만 지운다 — 지갑 발급분(user_coupons)은
// on delete cascade 로 함께 정리된다.
export async function deleteCoupon(
  formData: FormData,
): Promise<CouponActionResult> {
  const user = await requireAdmin();
  if (!adminConfigured())
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY 미설정" };
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, message: "쿠폰 정보가 올바르지 않습니다." };

  const supabase = createAdminClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("code, used_count")
    .eq("id", id)
    .single();
  if (!coupon) return { ok: false, message: "쿠폰을 찾을 수 없습니다." };
  if ((coupon.used_count ?? 0) > 0)
    return {
      ok: false,
      message: "이미 사용된 쿠폰은 삭제할 수 없습니다. 비활성화만 가능합니다.",
    };

  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error)
    // 주문(pending 포함)이 참조 중이면 FK 로 막힌다 — 삭제 대신 비활성화로 유도.
    return {
      ok: false,
      message: "이 쿠폰을 참조하는 주문이 있어 삭제할 수 없습니다. 비활성화하세요.",
    };

  await logAdminAction(user, {
    action: "coupon.delete",
    targetTable: "coupons",
    targetId: id,
    meta: { code: coupon.code },
  });
  revalidatePath("/admin/coupons");
  return { ok: true, message: `쿠폰 '${coupon.code}' 삭제 완료` };
}

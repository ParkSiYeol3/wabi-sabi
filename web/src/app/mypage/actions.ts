"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseUuid } from "@/lib/validation";

// WSB-004: 내 정보·배송지 변경 (RLS가 본인 데이터만 허용).

// 입력 스키마 (Zod 3차) — 체크아웃 배송지(#60)와 동일 기준.
const addressSchema = z.object({
  recipient: z.string().trim().min(1).max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-]{9,13}$/),
  address: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(100),
  postcode: z.string().trim().max(10),
});

export type UpdateNameResult = { ok: boolean; message: string };

// useActionState 시그니처 — 저장 완료/실패 메시지를 폼에서 인라인 표시(대표님).
export async function updateName(
  _prev: UpdateNameResult | null,
  formData: FormData,
): Promise<UpdateNameResult> {
  // 닉네임 — 커뮤니티·리뷰 표시 이름(2~20자). 모달(setNickname)과 정책 일치.
  const name = String(formData.get("name") || "").trim().slice(0, 20);
  if (name.length < 2) {
    return { ok: false, message: "닉네임은 2~20자로 입력해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", user.id);
  if (error) {
    return { ok: false, message: "저장에 실패했습니다. 다시 시도해 주세요." };
  }

  revalidatePath("/mypage");
  return { ok: true, message: "저장되었습니다." };
}

export async function addAddress(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const parsed = addressSchema.safeParse({
    recipient: String(formData.get("recipient") || ""),
    phone: String(formData.get("phone") || ""),
    address: String(formData.get("address") || ""),
    detail: String(formData.get("detail") || ""),
    postcode: String(formData.get("postcode") || ""),
  });
  if (!parsed.success) return;
  const { recipient, phone, address, detail, postcode } = parsed.data;

  await supabase.from("addresses").insert({
    user_id: user.id,
    recipient,
    phone,
    address,
    detail: detail || null,
    postcode: postcode || null,
  });
  revalidatePath("/mypage");
}

export async function deleteAddress(formData: FormData) {
  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS가 본인 것만 삭제 허용하지만 명시적으로도 user_id 조건
  await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/mypage");
}

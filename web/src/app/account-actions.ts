"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 닉네임 설정(개인정보보호) — 가입 후 표시 이름을 실명 대신 별명으로. profiles.name
// 을 갱신하고 nickname_set=true 로 표시해 모달이 다시 뜨지 않게 한다. RLS(update own)로
// 본인 것만. 이후 오늘의 와비사비 글·댓글·리뷰의 author_name 이 이 이름을 쓴다.
export type NicknameResult = { ok: boolean; message: string };

// 2~20자, 공백만은 불가. 앞뒤 공백 제거.
const nicknameSchema = z
  .string()
  .trim()
  .min(2, "닉네임은 2자 이상이어야 합니다.")
  .max(20, "닉네임은 20자 이내여야 합니다.");

export async function setNickname(
  _prev: NicknameResult | null,
  formData: FormData,
): Promise<NicknameResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const parsed = nicknameSchema.safeParse(String(formData.get("nickname") || ""));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "닉네임을 확인하세요." };

  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.data, nickname_set: true })
    .eq("id", user.id);
  if (error) {
    console.error("[nickname] update 실패", error);
    return { ok: false, message: "저장에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  // 표시 이름이 바뀌는 화면들 최신화.
  revalidatePath("/today");
  revalidatePath("/mypage");
  return { ok: true, message: "저장되었습니다." };
}

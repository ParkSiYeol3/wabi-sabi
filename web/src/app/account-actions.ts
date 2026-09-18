"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { CONSENT_VERSIONS } from "@/lib/consent";

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

  // 모달의 마케팅 수신 동의(선택, #671). 소셜 가입 회원은 가입 화면에 체크박스가
  // 없어 이 자리가 첫 동의 기회다. 체크 여부와 무관하게 이력을 남긴다 — "안 함"도
  // 기록해 둬야 나중에 동의 여부를 다툴 일이 없다. 실패해도 닉네임 저장은 유효하다.
  await recordMarketingConsent(user.id, formData.get("marketing") === "on");

  // 표시 이름이 바뀌는 화면들 최신화.
  revalidatePath("/today");
  revalidatePath("/mypage");
  return { ok: true, message: "저장되었습니다." };
}

// 마케팅 동의 이력 한 행 추가. user_consents(0050)는 insert 정책이 없어 service_role
// 전용이다 — 사용자가 직접 쓸 수 없고 서버만 기록한다. 이력이라 update 하지 않고
// 매번 append 하며, 최신 행이 현재 상태다(동의·철회 모두 남는다).
async function recordMarketingConsent(
  userId: string,
  agreed: boolean,
): Promise<boolean> {
  if (!adminConfigured()) return false;
  const { error } = await createAdminClient().from("user_consents").insert({
    user_id: userId,
    type: "marketing",
    version: CONSENT_VERSIONS.marketing,
    agreed,
  });
  if (error) {
    console.error("[consent] 마케팅 동의 기록 실패", error);
    return false;
  }
  return true;
}

// 마케팅 수신 동의 켜고 끄기(#671) — 마이페이지 토글. 정보통신망법상 수신 거부(철회)
// 수단이 있어야 하므로 끄는 것도 같은 경로로 기록한다.
export type ConsentResult = { ok: boolean; message: string; agreed: boolean };

export async function setMarketingConsent(
  _prev: ConsentResult | null,
  formData: FormData,
): Promise<ConsentResult> {
  const agreed = formData.get("agreed") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 실패 시 화면을 바꾸지 않도록 이전 상태(!agreed)를 돌려준다.
  if (!user)
    return { ok: false, message: "로그인이 필요합니다.", agreed: !agreed };

  if (!(await recordMarketingConsent(user.id, agreed)))
    return {
      ok: false,
      message: "저장에 실패했습니다. 잠시 후 다시 시도하세요.",
      agreed: !agreed,
    };

  revalidatePath("/mypage");
  return {
    ok: true,
    message: agreed ? "좋은 소식 보내드리겠습니다." : "해제되었습니다.",
    agreed,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanShortcuts, DEFAULT_SHORTCUTS } from "@/lib/admin-shortcuts";

// 대시보드 바로가기(0084) 읽기·저장. 지금 로그인한 관리자 것만.

export async function loadMyShortcuts(): Promise<string[]> {
  const me = await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("admin_prefs")
    .select("shortcuts")
    .eq("user_id", me.id)
    .maybeSingle();
  // 줄이 없거나(아직 안 고름) 조회 실패면 기본값. 대시보드를 막지 않는다.
  if (error || !data) return DEFAULT_SHORTCUTS;
  return cleanShortcuts(data.shortcuts);
}

export async function saveMyShortcuts(
  hrefs: string[],
): Promise<{ ok: true; shortcuts: string[] } | { ok: false; error: string }> {
  const me = await requireAdmin();
  const shortcuts = cleanShortcuts(hrefs);
  const { error } = await createAdminClient()
    .from("admin_prefs")
    .upsert({ user_id: me.id, shortcuts, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[admin] 바로가기 저장 실패:", error.message);
    return { ok: false, error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/admin");
  return { ok: true, shortcuts };
}

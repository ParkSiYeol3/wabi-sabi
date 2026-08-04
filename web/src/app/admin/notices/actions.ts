"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";

export async function createNotice(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim().slice(0, 10_000);
  if (!title || !body) return;

  const supabase = createAdminClient();
  const { data: inserted } = await supabase
    .from("notices")
    .insert({ title, body })
    .select("id")
    .single();
  await logAdminAction(user, {
    action: "notice.create",
    targetTable: "notices",
    targetId: inserted?.id ?? null,
    meta: { title },
  });
  // 태그 무효화 — unstable_cache(getNotices/getNotice)를 즉시 갱신(상단 공지 바
  // 포함 전 경로). revalidatePath 는 경로 캐시만 지워 데이터 캐시가 남았다.
  // updateTag: 서버 액션 전용 즉시 무효화(read-your-own-writes, Next 16).
  updateTag("notices");
  revalidatePath("/admin/notices");
  revalidatePath("/notice");
}

export async function deleteNotice(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("notices").delete().eq("id", id);
  await logAdminAction(user, {
    action: "notice.delete",
    targetTable: "notices",
    targetId: id,
  });
  updateTag("notices");
  revalidatePath("/admin/notices");
  revalidatePath("/notice");
  revalidatePath(`/notice/${id}`); // 캐시된 상세가 삭제 후에도 남지 않게
}

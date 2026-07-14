"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { parseUuid } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import { sendInquiryAnsweredMail } from "@/lib/emails/inquiry-answered";

export async function answerInquiry(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  const answer = String(formData.get("answer") || "").trim().slice(0, 5_000);
  if (!id || !answer) return;

  const supabase = createAdminClient();
  const { data: updated } = await supabase
    .from("inquiries")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  // 실제로 갱신된 문의가 없으면(삭제된 글 등) 알림도 감사로그도 남기지 않는다.
  if (!updated || updated.length === 0) return;

  // 답변 알림 (#133) — 답변이 달려도 고객은 사이트를 다시 열어보기 전까지 알 수 없었다.
  // 발송 실패가 답변 저장을 되돌리지 않는다(로그만).
  await sendInquiryAnsweredMail(id).catch((e) =>
    console.error("[admin] 문의 답변 알림 실패 id=", id, e),
  );

  await logAdminAction(user, {
    action: "inquiry.answer",
    targetTable: "inquiries",
    targetId: id,
  });
  revalidatePath("/admin/inquiries");
  revalidatePath(`/inquiry/${id}`);
  revalidatePath("/inquiry");
}

export async function deleteInquiry(formData: FormData) {
  const user = await requireAdmin();
  if (!adminConfigured()) return;

  const id = parseUuid(formData.get("id"));
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("inquiries").delete().eq("id", id);
  await logAdminAction(user, {
    action: "inquiry.delete",
    targetTable: "inquiries",
    targetId: id,
  });
  revalidatePath("/admin/inquiries");
  revalidatePath("/inquiry");
}

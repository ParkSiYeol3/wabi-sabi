import { sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { inquiryAnsweredMail } from "./templates";

// 문의 답변 알림 (#133) — 답변이 달려도 고객에게 알림이 가지 않아, 사이트를 다시
// 열어보기 전까지 답변을 받은 줄 모른다.
//
// 답변 본문은 메일에 싣지 않는다. 비밀글이 메일 경유로 노출되는 위험을 만들지 않기 위해
// "답변이 등록되었습니다 + 링크"만 보낸다(작성자 본인만 로그인 후 열람 — RLS).
// 본문은 templates.ts(#748).

export async function sendInquiryAnsweredMail(inquiryId: string): Promise<void> {
  if (!adminConfigured()) return;

  const admin = createAdminClient();
  const { data: inquiry } = await admin
    .from("inquiries")
    .select("title, user_id")
    .eq("id", inquiryId)
    .maybeSingle<{ title: string; user_id: string | null }>();

  // 탈퇴한 회원의 문의는 user_id 가 null(0018) — 보낼 곳이 없다.
  if (!inquiry?.user_id) return;

  const { data: authUser } = await admin.auth.admin.getUserById(inquiry.user_id);
  const to = authUser?.user?.email;
  if (!to) return;

  await sendMail({
    to,
    ...inquiryAnsweredMail({ inquiryId, title: inquiry.title }),
  });
}

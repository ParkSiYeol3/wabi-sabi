import { escapeHtml, sendMail } from "@/lib/email";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { site, business } from "@/lib/site";

// 문의 답변 알림 (#133) — 답변이 달려도 고객에게 알림이 가지 않아, 사이트를 다시
// 열어보기 전까지 답변을 받은 줄 모른다.
//
// 답변 본문은 메일에 싣지 않는다. 비밀글이 메일 경유로 노출되는 위험을 만들지 않기 위해
// "답변이 등록되었습니다 + 링크"만 보낸다(작성자 본인만 로그인 후 열람 — RLS).

const BASE = "https://wasa.kr";

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
    subject: `[${site.name}] 문의하신 내용에 답변이 등록되었습니다`,
    html: `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;max-width:560px;margin:0 auto;color:#2b2926">
      <h1 style="font-size:18px;letter-spacing:.08em">${escapeHtml(site.name)}</h1>
      <p style="font-size:15px">문의하신 내용에 답변이 등록되었습니다.</p>

      <p style="margin-top:20px;padding:12px 16px;background:#f5f3ef;font-size:14px">
        ${escapeHtml(inquiry.title)}
      </p>

      <p style="margin-top:24px">
        <a href="${BASE}/inquiry/${inquiryId}" style="color:#2b2926">답변 확인하기</a>
      </p>

      <p style="margin-top:28px;font-size:12px;color:#8a847c;line-height:1.8">
        답변 내용은 보안을 위해 메일에 포함하지 않습니다. 로그인 후 확인해 주세요.<br>
        문의: ${escapeHtml(business.email)}
      </p>
    </div>`,
  });
}

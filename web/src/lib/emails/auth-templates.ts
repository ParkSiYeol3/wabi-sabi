import { button, layout, note } from "./layout";

// Supabase 인증 메일 템플릿의 원본(#868). 이 메일은 우리 서버가 아니라 Supabase 가
// 보내므로, 내용을 바꾸면 Management API(PATCH /v1/projects/{ref}/config/auth 의
// mailer_subjects_recovery·mailer_templates_recovery_content)로 다시 올려야 반영된다.
// {{ .SiteURL }}·{{ .TokenHash }} 는 Supabase 가 채운다.

// 비밀번호 재설정 — 링크는 /auth/reset 에서 제출할 때 확인한다(actions.resetPassword).
export function passwordRecoveryTemplate(): { subject: string; html: string } {
  return {
    subject: "[WABI-SABI] 비밀번호 재설정 안내",
    html: layout({
      preheader: "아래 버튼을 눌러 새 비밀번호를 정해 주세요.",
      title: "비밀번호 재설정 안내",
      intro:
        "비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 정해 주세요.",
      body:
        button("{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}", "새 비밀번호 정하기") +
        note(
          "링크는 1시간 동안 한 번 쓸 수 있습니다. 요청하지 않으셨다면 이 메일은 무시하셔도 됩니다. 비밀번호는 바뀌지 않습니다.",
        ),
    }),
  };
}

import { button, layout, note } from "./layout";

// Supabase 인증 메일 템플릿의 원본(#868). 이 메일은 우리 서버가 아니라 Supabase 가
// 보내므로, 내용을 바꾸면 Management API(PATCH /v1/projects/{ref}/config/auth 의
// mailer_subjects_recovery·mailer_templates_recovery_content, 가입 인증은
// mailer_subjects_confirmation·mailer_templates_confirmation_content)로 다시 올려야 반영된다.
// {{ .SiteURL }}·{{ .TokenHash }} 는 Supabase 가 채운다.

// 비밀번호 재설정 — 링크는 /auth/reset 에서 제출할 때 확인한다(actions.resetPassword).
// 토큰은 # 뒤에 둬서 첫 요청(서버 로그)에 실리지 않게 한다.
export function passwordRecoveryTemplate(): { subject: string; html: string } {
  return {
    subject: "[WABI-SABI] 비밀번호 재설정 안내",
    html: layout({
      preheader: "아래 버튼을 눌러 새 비밀번호를 정해 주세요.",
      title: "비밀번호 재설정 안내",
      intro:
        "비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 정해 주세요.",
      body:
        button("{{ .SiteURL }}/auth/reset#token_hash={{ .TokenHash }}", "새 비밀번호 정하기") +
        note(
          "링크는 1시간 동안 한 번 쓸 수 있습니다. 요청하지 않으셨다면 이 메일은 무시하셔도 됩니다. 비밀번호는 바뀌지 않습니다.",
        ),
    }),
  };
}

// 가입 인증 — 링크를 열면 /auth/confirm 이 브라우저에서 인증하고 로그인시킨다.
// 토큰은 # 뒤(서버 요청에 실리지 않게). 메일 검사기가 먼저 열어도 인증만 끝날 뿐이라
// 재설정과 달리 버튼을 한 번 더 누르게 하지 않는다.
export function signupConfirmationTemplate(): { subject: string; html: string } {
  return {
    subject: "[WABI-SABI] 이메일 인증 안내",
    html: layout({
      preheader: "아래 버튼을 눌러 가입을 마무리해 주세요.",
      title: "이메일 인증 안내",
      intro:
        "와비사비에 가입해 주셔서 감사합니다. 아래 버튼을 눌러 이메일 인증을 마치면 가입이 완료됩니다.",
      body:
        button("{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}", "이메일 인증하기") +
        note(
          "링크는 1시간 동안 쓸 수 있습니다. 가입하지 않으셨다면 이 메일은 무시하셔도 됩니다.",
        ),
    }),
  };
}

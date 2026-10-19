// 로그인·가입·비밀번호 재설정이 함께 쓰는 입력 검사. 클라이언트·서버 양쪽에서 쓰므로
// 의존성 없이 둔다.

// 명백한 플레이스홀더/예약 도메인 — 실사용 이메일이 아니므로 가입·로그인 차단.
// RFC 2606 예약 도메인/TLD(example.*·.test·.invalid·.localhost) + test.com.
// (근본적인 유효성 확인은 Supabase '이메일 확인'(+Resend SMTP)이 담당한다.)
export function isPlaceholderEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return false;
  const blocked = new Set([
    "test.com",
    "example.com",
    "example.net",
    "example.org",
  ]);
  const blockedTld = [".test", ".invalid", ".example", ".localhost"];
  return blocked.has(domain) || blockedTld.some((t) => domain.endsWith(t));
}

// 비밀번호 정책(보안_체크리스트 P1) — 8자 이상 + 영문·숫자 포함. 통과하면 null.
// 72자 상한은 Supabase(bcrypt)가 그 뒤를 버려서.
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (password.length > 72) return "비밀번호는 72자 이하로 정해 주세요.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
  }
  return null;
}

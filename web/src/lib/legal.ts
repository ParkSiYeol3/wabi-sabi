// 개인정보처리방침 개정(#787) 시행 시각. 처리방침 9조 "변경 시 시행 7일 전 공지" 약속이라
// 수집 항목이 늘어나는 기능(비회원 이메일 칸)은 이 시각부터 켜진다. 처리방침 페이지도
// 이 시각을 기준으로 개정판을 보여 준다(1시간 ISR).
export const PRIVACY_V2_FROM = Date.parse("2026-10-12T00:00:00+09:00");

export function privacyV2Active(now: number = Date.now()): boolean {
  return now >= PRIVACY_V2_FROM;
}

// 개인정보처리방침 개정(#787) 시행 시각. 처리방침 9조 "변경 시 시행 7일 전 공지" 약속이라
// 수집 항목이 늘어나는 기능(비회원 이메일 칸)은 이 시각부터 켜진다. 처리방침 페이지도
// 이 시각을 기준으로 개정판을 보여 준다(1시간 ISR).
export const PRIVACY_V2_FROM = Date.parse("2026-10-12T00:00:00+09:00");

export function privacyV2Active(now: number = Date.now()): boolean {
  return now >= PRIVACY_V2_FROM;
}

// 채팅 상담(#881) 개정 시행일(KST 날짜). 처리방침에 '채팅 상담 내용' 수집이 더해져
// 7일 전 공지 뒤에만 켤 수 있다 → 공지일 + 7일로 정해지면 "YYYY-MM-DD" 를 넣는다.
// null 이면 개정판도 채팅 버튼도 손님에게 보이지 않는다(관리자는 미리 써 볼 수 있다).
// 2026-10-23 대표님 사이트 공지 게시 → 2026-10-30 0시(KST)부터 손님에게 열린다.
export const PRIVACY_V3_DATE: string | null = "2026-10-30";

export const PRIVACY_V3_FROM =
  PRIVACY_V3_DATE === null ? null : Date.parse(`${PRIVACY_V3_DATE}T00:00:00+09:00`);

export function privacyV3Active(now: number = Date.now()): boolean {
  return PRIVACY_V3_FROM !== null && now >= PRIVACY_V3_FROM;
}

// "2026-10-29" → "2026년 10월 29일"
export function koreanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

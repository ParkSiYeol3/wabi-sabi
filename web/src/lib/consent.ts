import { privacyV2Active } from "@/lib/legal";

// 약관·개인정보처리방침 동의 버전. 문서를 개정하면 여기 날짜를 올린다 → 이후 가입자는
// 새 버전으로 동의 이력이 남고, 기존 이력은 과거 버전 그대로 보존된다(동의 시점 추적).
export const CONSENT_VERSIONS = {
  terms: "2026-08-15",
  privacy: "2026-08-15",
  // 마케팅 수신(선택) — 가입 화면 체크박스·닉네임 모달·마이페이지 토글이 모두 이 버전으로
  // 이력을 남긴다(#671). 동의/철회 모두 한 행씩 쌓이고, 최신 행이 현재 상태다.
  marketing: "2026-08-15",
} as const;

// 처리방침은 개정판(#787)이 2026-10-12 0시에 시행된다. 가입 순간 시행 중인 판으로 남긴다(#813).
export function privacyConsentVersion(now: number = Date.now()): string {
  return privacyV2Active(now) ? "2026-10-12" : CONSENT_VERSIONS.privacy;
}

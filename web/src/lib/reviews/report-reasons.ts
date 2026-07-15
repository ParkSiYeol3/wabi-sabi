// 리뷰 신고 사유 프리셋 (#141) — 단일 출처.
// 클라이언트 <select> 와 서버 액션 zod 검증이 같은 목록을 쓴다. 서버 액션 파일은
// "use server" 라 const 를 export 할 수 없으므로 여기 둔다. Server Action 은 UI 를
// 거치지 않고 직접 호출될 수 있어, 반드시 서버에서도 이 목록으로 enum 검증한다.
export const REPORT_REASONS = [
  "스팸·광고",
  "욕설·비방",
  "허위·부적절",
  "기타",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

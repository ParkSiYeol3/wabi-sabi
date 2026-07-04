// 서버 액션 결과 — useActionState 로 폼에 성공/실패 피드백 전달.
// ("use server" 파일은 async 함수 외 export 불가라 별도 파일)
export interface ActionResult {
  ok: boolean;
  message: string;
}

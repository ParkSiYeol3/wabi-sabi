import {
  isAuthApiError,
  isAuthSessionMissingError,
  type AuthError,
} from "@supabase/supabase-js";

// 서버가 "이 세션은 이제 없다"고 답한 오류인가(#725) — 탈퇴한 계정, 다른 기기에서 전체
// 로그아웃, 서버가 쿠키를 지운 뒤 등. 이때 브라우저에 남은 세션은 지워야 한다. 안 지우면
// 화면은 로그인인데 서버는 비로그인이라 /mypage ↔ /auth 가 끝없이 서로 보낸다.
//
// 네트워크 실패(재시도형 오류)는 여기에 들지 않는다 — 잠깐 끊겼다고 로그아웃시키면 안 된다.
export function isStaleSessionError(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  if (isAuthSessionMissingError(error)) return true;
  return (
    isAuthApiError(error) &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  );
}

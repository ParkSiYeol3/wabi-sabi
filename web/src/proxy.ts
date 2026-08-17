import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: middleware → proxy (nodejs 런타임). 매 요청 Supabase 세션 갱신.
export async function proxy(request: NextRequest) {
  // 소셜 계정 연결(linkIdentity) 충돌 처리 — 이미 다른 계정에 연결된 소셜을 연결하면
  // GoTrue 가 우리 콜백 대신 Site URL(홈)로 ?error_code=identity_already_exists 를
  // 붙여 되돌린다. 그대로 두면 사용자는 실패 안내 없이 홈만 보고 성공한 줄 안다.
  // 클라 플래그에 의존하지 않고, 어느 경로든 이 에러가 쿼리에 있으면 서버에서 곧장
  // 마이페이지 안내로 보낸다(에러코드가 링크 충돌 전용이라 오탐 없음).
  const errorCode = request.nextUrl.searchParams.get("error_code");
  if (errorCode === "identity_already_exists") {
    return NextResponse.redirect(new URL("/mypage?link_error=1", request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일·이미지 최적화·favicon 제외한 모든 경로
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

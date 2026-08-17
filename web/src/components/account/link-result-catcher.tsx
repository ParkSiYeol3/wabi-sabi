"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 소셜 계정 연결(linkIdentity) 결과 감지 — 전역 마운트.
//
// 배경: 연결하려는 소셜이 이미 다른 계정에 연결돼 있으면(한 소셜=한 계정) GoTrue 는
// 연결을 거부한다. 이때 redirectTo(/auth/callback?...&flow=link)를 반영하지 않고
// Site URL(홈)로 폴백하는 경우가 있어, 서버 콜백의 link_error 처리를 못 거치고
// 안내 없이 홈에 착지한다 → 사용자는 연결이 "성공한 줄" 안다.
//
// 방어: LinkedAccounts 가 연결을 시작할 때 sessionStorage 플래그를 심는다. 이후 어느
// 페이지든 최초 로드 시(OAuth 왕복은 전체 문서 로드라 layout 이 재마운트됨) 플래그가
// 있으면 링크 흐름으로 돌아온 것이다. 정상 성공은 콜백이 /mypage 로 되돌리므로,
// /mypage 밖(대개 홈)에 있으면 redirectTo 미반영 = 실패로 간주해 /mypage?link_error=1
// 로 보내 안내 배너를 띄운다. (플래그는 항상 소비해 재발 방지.)
//
// 중단(뒤로가기)으로 플래그가 남아도, OAuth 취소는 시작 지점인 /mypage 로 되돌아오므로
// 아래 /mypage 가드에 걸려 무해하게 소비된다. 굳이 유효시간을 두지 않는다.
export const LINK_FLAG = "wsb_linking";

export function LinkResultCatcher() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // GoTrue 는 연결 충돌을 쿼리뿐 아니라 URL 해시(#error=...&error_code=...)로도
    // 되돌린다. 해시는 서버(proxy)가 못 읽으므로 여기서 직접 감지한다(플래그 유실 대비).
    const conflict =
      window.location.search.includes("identity_already_exists") ||
      window.location.hash.includes("identity_already_exists");
    const hadFlag = sessionStorage.getItem(LINK_FLAG) !== null;
    // 플래그는 이번 착지에서 소비한다(성공·실패 무관).
    sessionStorage.removeItem(LINK_FLAG);

    if (!conflict && !hadFlag) return;
    // 콜백이 정상 반영되면 /mypage 로 돌아온다(성공 또는 이미 link_error 배너).
    // 그 밖(홈 등)에 착지 = redirectTo 미반영 = 연결 실패.
    if (window.location.pathname.startsWith("/mypage")) return;
    router.replace("/mypage?link_error=1");
  }, [router]);

  return null;
}

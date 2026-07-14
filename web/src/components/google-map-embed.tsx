import { site } from "@/lib/site";

// 구글 지도 임베드 (#119) — API 키 없이 동작하는 공개 임베드.
// 네이버 SDK 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 없거나 지오코딩이 실패했을 때
// 지도 칸이 비지 않도록 하는 폴백. 대표님 확인: 구글은 이 주소를 정확히 찾는다.
export function GoogleMapEmbed() {
  const q = encodeURIComponent(site.roadAddress);
  return (
    <iframe
      src={`https://maps.google.com/maps?q=${q}&z=17&hl=ko&output=embed`}
      title={`${site.place} 위치 지도 — ${site.roadAddress}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="h-full w-full border-0"
    />
  );
}

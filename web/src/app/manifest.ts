import type { MetadataRoute } from "next";

// 웹앱 매니페스트(#) — 모바일 "홈 화면에 추가" 시 브랜드 이름·아이콘·크림 배경으로
// 뜨고, 안드로이드 크롬은 standalone 실행 시 테마색(크림)으로 상·하단을 물들인다.
// 대표님 모바일 우선 방침의 마무리. 아이콘은 이미 있는 512 정사각 로고를 재사용
// (any + maskable 둘 다 지정 — 안드로이드 아이콘 마스킹에서 여백 잘림 방지).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "와비사비 WABI-SABI",
    short_name: "와비사비",
    description:
      "순간의 아름다움보다 시간이 만들어내는 가치를 믿는 곳. 오래 곁에 두고 싶은 기물과 오브제를 큐레이션합니다.",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#f3ebdd",
    theme_color: "#f3ebdd",
    icons: [
      {
        src: "/brand/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import { ImageResponse } from "next/og";

// #16 SEO: 사이트 기본 OG 이미지 — 링크 공유(카톡·인스타 DM 등) 미리보기 카드.
// ImageResponse 기본 내장 폰트는 라틴만 지원 → 텍스트는 영문 구성.
// 상품 상세는 generateMetadata 의 openGraph.images(실사진)가 이걸 덮어씀.
export const alt = "WABI-SABI — Living Select Shop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f3ef",
          color: "#2b2926",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "0.08em" }}>
          WABI-SABI
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: "#6f6a63",
            letterSpacing: "0.14em",
          }}
        >
          Living Select Shop
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#8a847c",
            letterSpacing: "0.2em",
          }}
        >
          TABLEWARE · OBJECTS · CRAFT · GIFTS
        </div>
        <div
          style={{
            marginTop: 48,
            width: 64,
            height: 4,
            backgroundColor: "#b7ada0",
          }}
        />
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            color: "#8a847c",
            letterSpacing: "0.12em",
          }}
        >
          wasa.kr
        </div>
      </div>
    ),
    size,
  );
}

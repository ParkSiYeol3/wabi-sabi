import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// #16 SEO: 사이트 기본 OG 이미지 — 링크 공유(카톡·iOS 공유시트 등) 미리보기 카드.
// iOS 공유시트/홈화면 미리보기가 apple-touch-icon 대신 이 큰 이미지를 쓰는 경우가
// 있어(대표님 제보 — 워드마크 텍스트만 뜸), 브랜드 붓 로고를 앞세운다.
// 로고 PNG 는 라우트에 co-locate 하고 readFileSync(import.meta.url) 로 읽는다 —
// fetch(file://) 는 정적 생성 중 미지원이라 빌드가 깨진다. nft 가 상대 경로 읽기를
// 추적해 번들에 og-mark.png 를 포함하므로 빌드·런타임 모두 안전하다.
export const alt = "WABI-SABI — Living Select Shop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  // 정적 생성 시점에 읽어 base64 로 굽는다(결과 PNG 는 정적). 함수 내부에서 읽어
  // 모듈 평가 단계의 예외가 다른 라우트로 번지지 않게 한다.
  const markSrc = `data:image/png;base64,${readFileSync(
    join(process.cwd(), "src/app/og-mark.png"),
  ).toString("base64")}`;

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
          backgroundColor: "#f3ebdd",
          color: "#2b2926",
        }}
      >
        {/* 브랜드 붓 마크 — og-mark.png(투명)을 크림 위에 */}
        <img src={markSrc} width={430} height={237} alt="" />
        <div
          style={{
            marginTop: 40,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          WABI-SABI
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: "#6f6a63",
            letterSpacing: "0.16em",
          }}
        >
          Living Select Shop
        </div>
        <div
          style={{
            marginTop: 26,
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

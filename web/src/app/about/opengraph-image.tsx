import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// about 전용 OG 이미지 — 네이버 검색 썸네일 대응.
// 네이버는 웹 문서 썸네일을 정사각 박스에 object-fit: cover(센터 크롭)로 넣는다.
// 사이트 기본 OG(1200×630)는 마크·문구가 커서 정사각으로 잘리면 상하가 붙어
// "여백이 부족해 깨진" 것처럼 보였다(대표님 제보). 여기선 콘텐츠를 중앙에 작게
// 모아, 세로 630 을 정사각으로 크롭해도 상하·좌우로 여백이 넉넉하게 남게 한다.
// (가로 1200×630 은 유지 — 카톡·트위터 카드 비율엔 그대로 좋다.)
export const alt = "WABI-SABI — Living Select Shop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function AboutOpenGraphImage() {
  // og-mark.png 은 app 루트에 co-locate. cwd 기준 절대경로로 읽어 base64 로 굽는다
  // (fetch(file://) 는 정적 생성 중 미지원). 사이트 기본 OG 와 동일 자산·기법.
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
        {/* 마크를 사이트 기본 OG(430w)보다 작게 — 정사각 크롭 시 여백 확보 */}
        <img src={markSrc} width={300} height={165} alt="" />
        <div
          style={{
            marginTop: 34,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          WABI-SABI
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#6f6a63",
            letterSpacing: "0.16em",
          }}
        >
          Living Select Shop
        </div>
      </div>
    ),
    size,
  );
}

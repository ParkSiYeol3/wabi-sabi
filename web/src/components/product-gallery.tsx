import Image from "next/image";
import { ImageIcon } from "lucide-react";

// 상품 상세 이미지 갤러리 (#248 → 불규칙 배치, 대표님 시안 tableofcraft).
// 여러 장을 세로로 나열하되 폭·좌우 정렬·비율을 층마다 달리해 "불규칙하게 흩어진"
// 느낌을 준다. 다만 전부 가운데 열(max-w) 안에서만 움직여 화면 중앙을 벗어나지
// 않는다. 상태 없는 서버 컴포넌트 — 인덱스 기반 결정적 패턴이라 SSR/클라 동일.
//
// object-cover 는 비율에 맞춰 잘라내므로 원본이 저해상도면 확대되어 흐릴 수 있다
// (화질은 업로드 원본 해상도에 달림 — 별도 운영 이슈).

// 폭 + 좌/우/가운데 정렬 조합 — 넓은 컷은 가운데, 좁은 컷은 좌우로 어긋나게.
const SLOTS = [
  { w: "w-full", align: "self-center" },
  { w: "w-[68%]", align: "self-start" },
  { w: "w-[82%]", align: "self-end" },
  { w: "w-[60%]", align: "self-center" },
  { w: "w-[88%]", align: "self-start" },
  { w: "w-[72%]", align: "self-end" },
] as const;
// 비율도 층마다 달라 높이가 들쭉날쭉하게.
const RATIOS = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[5/6]",
  "aspect-[3/4]",
] as const;
// 위아래 간격도 살짝 불규칙하게.
const GAPS = ["mt-0", "mt-10", "mt-6", "mt-14", "mt-8"] as const;

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-wabi-muted">
        <ImageIcon
          className="size-12 text-wabi-fg-muted/40"
          strokeWidth={1}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {images.map((src, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const ratio = RATIOS[i % RATIOS.length];
        const gap = i === 0 ? "mt-0" : GAPS[i % GAPS.length];
        return (
          <div
            key={i}
            className={`relative overflow-hidden bg-wabi-muted ${slot.w} ${slot.align} ${ratio} ${gap}`}
          >
            <Image
              src={src}
              alt={i === 0 ? name : `${name} 상세 이미지 ${i + 1}`}
              fill
              // 폭이 층마다 달라 대략치로 지정(레이아웃 시프트만 방지).
              sizes="(max-width: 768px) 90vw, 45vw"
              className="object-cover"
              // 첫 장은 LCP 후보라 preload(<link> 삽입), 나머지는 기본 lazy.
              // Next 16 은 priority 를 deprecate 하고 preload 로 대체했다.
              preload={i === 0}
            />
          </div>
        );
      })}
    </div>
  );
}

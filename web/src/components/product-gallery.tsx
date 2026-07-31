import { ProductImageZoom } from "@/components/product-image-zoom";

// 상품 상세 "나머지" 이미지 스캐터 (#248 → 불규칙 배치, 대표님 시안 tableofcraft).
// 첫(메인) 사진은 상단 히어로에서 정보와 함께 보여주고, 여기선 나머지 사진을
// 전체 폭에 불규칙하게 흩어 놓는다 — 폭·좌우 위치(margin-left)·비율·간격을 층마다
// 달리해 열 맞춤 없이 흩뿌린다. 스크롤을 내리면 히어로(사진+정보)는 위로 사라지고
// 이 사진들만 쭉 이어진다. 상태 없는 서버 컴포넌트 — 인덱스 기반 결정적(SSR 안정).
//
// 모바일은 폭이 좁아 흩뿌리면 답답하므로 전체 폭 세로 나열, 흩뿌림은 md 이상에서만.
// object-cover 라 원본이 저해상도면 확대되어 흐릴 수 있다(화질=업로드 원본 해상도).

// md 이상에서의 폭 + 좌측 오프셋(합이 100% 이내라 넘치지 않는다).
const SLOTS = [
  "md:w-[58%] md:ml-[0%]",
  "md:w-[46%] md:ml-[50%]",
  "md:w-[64%] md:ml-[13%]",
  "md:w-[44%] md:ml-[4%]",
  "md:w-[52%] md:ml-[46%]",
  "md:w-[60%] md:ml-[27%]",
] as const;
const RATIOS = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[5/6]",
] as const;
const GAPS = [
  "md:mt-24",
  "md:mt-14",
  "md:mt-28",
  "md:mt-16",
  "md:mt-20",
] as const;

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  if (images.length === 0) return null;

  return (
    <div className="mt-10 md:mt-16">
      {images.map((src, i) => {
        // 첫 스캐터 컷은 컨테이너 여백만, 이후는 모바일 mt-8 + 데스크톱 불규칙.
        const gap = i === 0 ? "" : `mt-8 ${GAPS[i % GAPS.length]}`;
        return (
          <div
            key={i}
            className={`relative overflow-hidden bg-wabi-muted ${gap} ${SLOTS[i % SLOTS.length]} ${RATIOS[i % RATIOS.length]}`}
          >
            <ProductImageZoom
              src={src}
              alt={`${name} 상세 이미지 ${i + 2}`}
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          </div>
        );
      })}
    </div>
  );
}

import { ProductImageZoom } from "@/components/product/product-image-zoom";

// 상품 상세 "나머지" 이미지 스캐터 (#248 → 불규칙 배치, 대표님 시안 tableofcraft).
// 첫(메인) 사진은 상단 히어로에서 정보와 함께 보여주고, 여기선 나머지 사진을
// 전체 폭에 불규칙하게 흩어 놓는다 — 폭·좌우 위치(margin-left)·비율·간격을 층마다
// 달리해 열 맞춤 없이 흩뿌린다. 스크롤을 내리면 히어로(사진+정보)는 위로 사라지고
// 이 사진들만 쭉 이어진다. 상태 없는 서버 컴포넌트 — 인덱스 기반 결정적(SSR 안정).
//
// 모바일도 불규칙하게(대표님) — 다만 폭이 좁아 데스크톱만큼 넓게 흩뿌리면 답답하므로
// 완만하게(폭 70~94%, 좌우 오프셋 소폭) 흩고, md 이상에서 더 과감하게 흩뿌린다.
// object-cover 라 원본이 저해상도면 확대되어 흐릴 수 있다(화질=업로드 원본 해상도).

// 폭 + 좌측 오프셋 — 모바일(기본) / md 이상 각각. 폭+오프셋 합이 100% 이내라 넘치지 않는다.
const SLOTS = [
  "w-[86%] ml-[0%] md:w-[58%] md:ml-[0%]",
  "w-[74%] ml-[26%] md:w-[46%] md:ml-[50%]",
  "w-[94%] ml-[6%] md:w-[64%] md:ml-[13%]",
  "w-[70%] ml-[4%] md:w-[44%] md:ml-[4%]",
  "w-[82%] ml-[18%] md:w-[52%] md:ml-[46%]",
  "w-[90%] ml-[10%] md:w-[60%] md:ml-[27%]",
] as const;
const RATIOS = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[5/6]",
] as const;
// 층 간격도 모바일/데스크톱 각각 불규칙하게.
const GAPS = [
  "mt-12 md:mt-24",
  "mt-7 md:mt-14",
  "mt-14 md:mt-28",
  "mt-8 md:mt-16",
  "mt-10 md:mt-20",
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
        // 첫 스캐터 컷은 컨테이너 여백만, 이후는 모바일·데스크톱 각각 불규칙 간격.
        const gap = i === 0 ? "" : GAPS[i % GAPS.length];
        return (
          <div
            key={i}
            className={`relative overflow-hidden bg-wabi-muted ${gap} ${SLOTS[i % SLOTS.length]} ${RATIOS[i % RATIOS.length]}`}
          >
            <ProductImageZoom
              src={src}
              alt={`${name} 상세 이미지 ${i + 2}`}
              sizes="(max-width: 768px) 94vw, 60vw"
            />
          </div>
        );
      })}
    </div>
  );
}

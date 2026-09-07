import { ProductImageZoom } from "@/components/product/product-image-zoom";

// 상품 상세 사진 배치 — 1 : 2 : 1 구성 (#611, 대표님 시안 B안).
//
// 처음엔 tableofcraft 를 참고한 무작위 흩뿌림이었다(#248). 규칙이 "불규칙하게"뿐이라
// 남의 사이트처럼 보인다는 지적을 받아 규칙 있는 4안을 만들어 비교했고(#609),
// 대표님이 별도 시안으로 이 구성을 골랐다 — 흩뿌리지 않고, 한 장 크게 → 두 장
// 나란히 → 한 장 크게 를 되풀이한다.
//
// 큰 한 장이 숨을 고르고 두 장이 시선을 나눴다가 다시 큰 한 장으로 모인다. 무작위가
// 아니라 반복되는 박자라 "왜 여기 있는가"에 답이 있고, 두 장 짝은 폭을 48:52 로
// 어긋내 완전한 이등분을 피한다(不均整 — 대칭 없이 이룬 균형).
//
// 상태 없는 서버 컴포넌트 — 인덱스 기반 결정적이라 SSR 이 흔들리지 않는다.
//
// 전폭 행은 원본 비율 그대로 둔다(대표님 #502 — 올린 모양대로). 짝 행만 높이를
// 맞춰 채운다(object-cover): 세로 사진과 가로 사진이 짝이 되면 높이가 크게 어긋나
// 한쪽에 빈 공간이 뭉텅이로 남아 고장난 것처럼 보이기 때문이고, 시안 B 도 짝은
// 같은 크기 상자로 그려져 있다. 잘리는 게 싫으면 object-contain 한 줄로 바꾸면 된다.

// 층 간격 — 큰 한 장 뒤엔 넉넉히, 짝 뒤엔 조금 좁게. 되풀이되는 호흡.
const ROW_GAP = ["mt-12 md:mt-24", "mt-10 md:mt-20", "mt-12 md:mt-24"] as const;

// 짝 행의 공통 높이 — 둘의 폭이 달라도(48:52) 높이는 같아야 한 벌로 보인다.
const PAIR_H = "h-56 sm:h-72 md:h-[26rem]";

// 이미지 인덱스를 행 단위로 묶는다: [한 장] → [두 장] → [한 장] → 되풀이.
// 짝을 만들 사진이 한 장뿐이면 그 장은 전폭으로 둔다(장수가 홀수여도 안 깨진다).
function toRows(n: number): number[][] {
  const rows: number[][] = [];
  let i = 0;
  let step = 0;
  while (i < n) {
    if (step === 1 && i + 1 < n) {
      rows.push([i, i + 1]);
      i += 2;
    } else {
      rows.push([i]);
      i += 1;
    }
    step = (step + 1) % 3;
  }
  return rows;
}

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
      {toRows(images.length).map((row, r) => (
        <div
          key={r}
          className={`flex items-end gap-3 md:gap-5 ${r === 0 ? "" : ROW_GAP[r % ROW_GAP.length]}`}
        >
          {row.map((i, k) => {
            const paired = row.length === 2;
            return (
              <div
                key={i}
                // 짝 행은 48:52 로 어긋내 정확한 반반을 피한다(왼쪽이 조금 좁다).
                style={paired ? { flexBasis: k === 0 ? "48%" : "52%" } : undefined}
                className={`relative min-w-0 grow bg-wabi-muted ${paired ? PAIR_H : ""}`}
              >
                <ProductImageZoom
                  src={images[i]}
                  alt={`${name} 상세 이미지 ${i + 1}`}
                  sizes={
                    paired
                      ? "(max-width: 768px) 48vw, 30vw"
                      : "(max-width: 768px) 94vw, 62vw"
                  }
                  natural={!paired}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

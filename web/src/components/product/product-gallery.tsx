import { ProductImageZoom } from "@/components/product/product-image-zoom";

// 상품 상세 사진 배치 (#248 → #609 → #611 → #613).
//
// 앞 네 장은 1 : 2 : 1 로 정돈하고(대표님 시안 B), 다섯 번째부터는 처음에 쓰던
// 불규칙 배치로 풀어놓는다(대표님 #613). 상품을 처음 볼 때는 규칙 있는 박자로
// 차분히 보여주고, 더 내려간 손님에게는 흩어진 리듬을 주자는 뜻이다.
//
//   1행  한 장     가운데   ← 여기 아래에 상세 설명이 들어간다(대표님 #613)
//   2행  두 장 나란히(48:52) 가운데
//   3행  한 장     가운데에서 왼쪽으로 흘림 ← 흩뿌림으로 넘겨주는 다리
//   4행~ 불규칙 — 폭·좌우 오프셋·간격이 층마다 다른 흩뿌림
//   맨끝 한 장     가운데   ← 첫 장과 같은 자리·같은 크기(대표님 #626)
//
// 마지막 한 장을 첫 장과 똑같이 두면 흩뿌림이 시작과 끝 사이에 갇힌다. 들고 날
// 때의 박자가 같아 페이지가 한 바퀴 돌아 제자리로 오는 느낌이 난다(序破急).
//
// 짝은 폭을 48:52 로 어긋내 정확한 반반을 피한다(不均整 — 대칭 없이 이룬 균형).
// 상태 없는 서버 컴포넌트 — 인덱스 기반 결정적이라 SSR 이 흔들리지 않는다.
//
// 전폭·불규칙 사진은 원본 비율 그대로 둔다(대표님 #502 — 올린 모양대로). 짝 행만
// 높이를 맞춰 채운다: 세로 사진과 가로 사진이 짝이 되면 높이가 크게 어긋나 한쪽에
// 빈 공간이 뭉텅이로 남아 고장난 것처럼 보이기 때문이다.

// 1:2:1 로 정돈해 보여줄 앞부분 장수 — 큰 한 장 + 짝 둘 + 큰 한 장.
const ORDERED_COUNT = 4;

// 사진이 너무 크다는 피드백(대표님 2026-09-08) — 컨테이너 폭을 그대로 쓰지 않고
// 한 뼘 물린다. 오른쪽에 남는 여백이 곧 사진의 크기를 정해 준다. 폭은 칸이 아니라
// 행에 건다 — 칸에 걸면 두 장짜리 행은 grow 로 다시 전폭이 돼 큰 사진보다 넓어진다.
// 짝 행은 둘이 나눠 가지므로 한 장짜리보다 조금 넓게 잡아야 각각이 작아 보이지 않는다.
// (다시 한 단계 더 줄였다 — 대표님 #626 "훨씬 작게". 짝 행도 같이 내려야
// 한 장짜리가 여전히 가장 큰 장으로 읽힌다.)
const ROW_W = ["w-[72%] md:w-[46%]", "w-[86%] md:w-[64%]"] as const;

// 정돈 구간의 좌우 자리 — 층 번호(r)로 고른다(대표님 #648 → #653).
//
// 정돈 구간은 폭을 줄여 놓았으므로(ROW_W) 왼쪽에 붙이면 남는 폭이 통째로
// 오른쪽에 몰린다. 데스크톱 1440px 에선 그 빈 자리가 화면의 절반 가까이라
// 여백(間)이 아니라 덜 그려진 화면으로 보였다. 앞 두 층을 가운데로 세운다.
//
// 셋째 층만 가운데에서 왼쪽으로 흘린다. 정돈(序)이 가운데인데 넷째 층부터
// 흩뿌림(破)이 왼쪽에서 시작하면 그 사이가 뚝 끊긴다. 셋째 층이 미리 그쪽으로
// 기울어 다음 박자를 예고하는 다리 역할을 한다(不均整 — 대칭 없이 이룬 균형).
//
// 가운데였다면 왼쪽 여백이 모바일 14% · 데스크톱 27% 인 자리다. 그 절반쯤으로
// 당겨 "치우쳤다"가 아니라 "기울었다"로 읽히게 한다.
const ROW_ALIGN = [
  "mx-auto",
  "mx-auto",
  "ml-[6%] mr-auto md:ml-[16%]",
] as const;

// 짝 행의 공통 높이 — 둘의 폭이 달라도(48:52) 높이는 같아야 한 벌로 보인다.
// 큰 사진과 함께 한 단계씩 낮췄다(대표님, #626 재차).
const PAIR_H = "h-36 sm:h-48 md:h-64";

// 불규칙 구간 — 폭 + 좌측 오프셋(모바일 / md 이상). 합이 100% 이내라 넘치지 않는다.
// 모바일은 폭이 좁아 데스크톱만큼 흩뿌리면 답답하므로 완만하게 흩는다.
// (폭을 한 단계씩 줄였다 — 대표님 2026-09-08. 흩뿌림의 리듬은 그대로 두고 크기만.)
const SLOTS = [
  "w-[72%] ml-[0%] md:w-[46%] md:ml-[2%]",
  "w-[62%] ml-[30%] md:w-[37%] md:ml-[56%]",
  "w-[78%] ml-[8%] md:w-[50%] md:ml-[16%]",
  "w-[58%] ml-[4%] md:w-[35%] md:ml-[6%]",
  "w-[68%] ml-[24%] md:w-[42%] md:ml-[52%]",
  "w-[75%] ml-[12%] md:w-[48%] md:ml-[30%]",
] as const;
const GAPS = [
  "mt-12 md:mt-24",
  "mt-7 md:mt-14",
  "mt-14 md:mt-28",
  "mt-8 md:mt-16",
  "mt-10 md:mt-20",
] as const;

// 정돈 구간의 층 간격 — 큰 한 장 뒤엔 넉넉히, 짝 뒤엔 조금 좁게.
const ROW_GAP = ["", "mt-10 md:mt-20", "mt-12 md:mt-24"] as const;

// 앞부분을 행으로 묶는다: [한 장] → [두 장] → [한 장]. 장수가 모자라면 있는 만큼만.
function orderedRows(n: number): number[][] {
  const rows: number[][] = [[0]];
  if (n >= 3) rows.push([1, 2]);
  else if (n === 2) rows.push([1]);
  if (n >= 4) rows.push([3]);
  return rows;
}

export function ProductGallery({
  images,
  name,
  description,
}: {
  images: string[];
  name: string;
  // 상세 설명 — 첫 사진 바로 아래에 놓는다(대표님 #613). 정보 칸이 아니라 사진
  // 흐름 안에서 읽히게 하려는 배치라 여기로 내려왔다.
  description?: string | null;
}) {
  if (images.length === 0) return null;

  const headCount = Math.min(images.length, ORDERED_COUNT);
  const rows = orderedRows(headCount);

  // 정돈 구간 뒤에 남는 장들. 그중 맨 끝 한 장은 첫 장과 같은 자리로 빼 둔다 —
  // 남는 게 한 장뿐이면 흩뿌릴 것 없이 그 한 장이 곧 마지막 장이다.
  const tail = images.slice(ORDERED_COUNT);
  const last = tail.length > 0 ? tail[tail.length - 1] : null;
  const scattered = tail.slice(0, -1);

  return (
    <div className="mt-10 md:mt-16">
      {rows.map((row, r) => (
        <div key={`o${r}`}>
          <div
            className={`flex items-end gap-3 md:gap-5 ${ROW_W[row.length === 2 ? 1 : 0]} ${ROW_ALIGN[r] ?? "mx-auto"} ${ROW_GAP[r % ROW_GAP.length]}`}
          >
            {row.map((i, k) => {
              const paired = row.length === 2;
              return (
                <div
                  key={i}
                  // 짝 행은 48:52 로 어긋내 정확한 반반을 피한다(왼쪽이 조금 좁다).
                  style={
                    paired ? { flexBasis: k === 0 ? "48%" : "52%" } : undefined
                  }
                  className={`relative min-w-0 grow bg-wabi-muted ${paired ? PAIR_H : ""}`}
                >
                  <ProductImageZoom
                    src={images[i]}
                    alt={`${name} 상세 이미지 ${i + 1}`}
                    sizes={
                      paired
                        ? "(max-width: 768px) 44vw, 26vw"
                        : "(max-width: 768px) 86vw, 46vw"
                    }
                    natural={!paired}
                  />
                </div>
              );
            })}
          </div>

          {/* 상세 설명 — 첫 사진 바로 아래(대표님 #613). 한 줄이 너무 길면 읽기
              힘들어 폭을 제한한다. 관리자가 넣은 엔터·빈 줄은 그대로 보존.
              첫 층을 가운데로 세웠으므로 글도 같이 가운데로 — 사진만 옮기면
              글이 홀로 왼쪽에 남아 딸린 글로 안 읽힌다(#653). 글줄 자체는
              왼쪽 정렬 그대로다(가운데 정렬한 본문은 읽기 나쁘다). */}
          {r === 0 && description && (
            <p className="mx-auto mt-8 max-w-2xl whitespace-pre-line text-sm leading-7 text-wabi-fg-muted md:mt-12">
              {description}
            </p>
          )}
        </div>
      ))}

      {/* 다섯 번째 사진부터 — 처음에 쓰던 불규칙 배치(대표님 #613).
          단, 맨 마지막 한 장은 흩뿌리지 않고 첫 장 자리로 돌려놓는다. */}
      {scattered.map((src, k) => {
        const i = ORDERED_COUNT + k;
        return (
          <div
            key={i}
            className={`relative bg-wabi-muted ${GAPS[k % GAPS.length]} ${SLOTS[k % SLOTS.length]}`}
          >
            <ProductImageZoom
              src={src}
              alt={`${name} 상세 이미지 ${i + 1}`}
              sizes="(max-width: 768px) 76vw, 46vw"
              natural
            />
          </div>
        );
      })}

      {/* 마지막 한 장 — 첫 장과 같은 폭, 같은 자리(대표님 #626). 첫 장이
          가운데로 갔으므로 이 장도 같이 간다 — 둘이 어긋나면 페이지가 제자리로
          돌아오는 박자가 깨진다(序破急). */}
      {last && (
        <div
          className={`relative mx-auto bg-wabi-muted mt-12 md:mt-24 ${ROW_W[0]}`}
        >
          <ProductImageZoom
            src={last}
            alt={`${name} 상세 이미지 ${images.length}`}
            sizes="(max-width: 768px) 86vw, 46vw"
            natural
          />
        </div>
      )}
    </div>
  );
}

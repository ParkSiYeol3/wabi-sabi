import { seededRandom, type Stone } from "@/lib/queries/garden";

// 石組(이시구미) — 돌을 놓는 규칙 (#616).
//
// 가레산스이의 돌은 흩어져 있는 게 아니라 홀수 무리로 묶인다. 료안지는 5·2·3·2·3
// 다섯 무리다. 짝수로 묶으면 눈이 가운데를 찾아 대칭으로 읽히기 때문에 피한다.
//
// 좌표는 서버에서 정한다 — 날짜 씨앗이 같으면 결과가 같아 하이드레이션이 어긋나지
// 않고, 클라이언트는 놓인 대로 그리기만 한다.
//
// 겹침은 충돌 검사로 밀어내지 않고 구조로 막는다: x 는 왼쪽에서 오른쪽으로 걸으며
// 무리 안에선 좁게, 무리 사이엔 넓게 벌리고, y 는 먼 띠와 가까운 띠를 번갈아 준다.
// 이웃한 두 돌은 x 가 가깝더라도 y 가 멀어 서로 가리지 않는다.

const GROUPS = [5, 2, 3, 2, 3] as const;

// 정원 폭·높이에 대한 백분율. 위쪽은 담과 그 너머 나무(借景)가, 아래쪽은
// 마루(縁側)가 덮으므로 모래로 쓸 수 있는 띠는 그 사이뿐이다.
const X_START = 4;
const FAR = [40, 51] as const;
const NEAR = [56, 69] as const;

export type PlacedStone = Stone & {
  // 정원 좌표(%) — 왼쪽 위 기준.
  x: number;
  y: number;
  // 돌 크기(vmin). 가까운 띠일수록 크게 — 원근.
  size: number;
  // 苔(이끼) — 돌 밑동에 앉은 이끼. 모든 돌에 있진 않다(있는 편이 자연스럽다).
  // 정원에서 유일한 초록이라 몇 군데만 둬야 눈에 든다.
  moss: Moss | null;
};

// 이끼 한 덩이 — 돌 기준 배수 크기와 어긋난 위치, 그리고 제각각인 모서리 반경.
export type Moss = {
  scale: number;
  dx: number;
  dy: number;
  radius: string;
};

// 무리 크기 목록. 돌이 모자라면 앞에서부터 채우고 남는 무리는 버린다.
function groupSizes(n: number): number[] {
  const out: number[] = [];
  let left = n;
  for (const g of GROUPS) {
    if (left <= 0) break;
    out.push(Math.min(g, left));
    left -= g;
  }
  // 열다섯을 넘겨 남으면(있을 리 없지만) 마지막 무리에 붙인다.
  if (left > 0) out[out.length - 1] += left;
  return out;
}

export function placeStones(stones: Stone[], dateKey: string): PlacedStone[] {
  const rand = seededRandom(`ishigumi-${dateKey}`);
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

  const placed: PlacedStone[] = [];
  let x = X_START;
  let far = rand() > 0.5;
  let k = 0;

  for (const size of groupSizes(stones.length)) {
    for (let m = 0; m < size; m++) {
      const band = far ? FAR : NEAR;
      const y = between(band[0], band[1]);
      // 가까운 띠(y 가 큰 쪽)일수록 크게 — 앞에 놓인 돌이 커 보이는 원근.
      const depth = (y - FAR[0]) / (NEAR[1] - FAR[0]);
      // 이끼는 절반 조금 안 되게 — 다 깔면 잔디밭이 되고 없으면 메마르다.
      const hasMoss = rand() < 0.45;
      placed.push({
        ...stones[k++],
        x,
        y,
        size: 12 + depth * 9 + between(-1.2, 1.2),
        moss: hasMoss
          ? {
              scale: between(1.5, 2.1),
              dx: between(-14, 14),
              dy: between(4, 18),
              // 완벽한 원이 아니라 손으로 앉힌 얼룩처럼 모서리를 제각각으로.
              radius: [
                `${Math.round(between(38, 62))}%`,
                `${Math.round(between(38, 62))}%`,
                `${Math.round(between(38, 62))}%`,
                `${Math.round(between(38, 62))}%`,
                "/",
                `${Math.round(between(40, 60))}%`,
                `${Math.round(between(40, 60))}%`,
                `${Math.round(between(40, 60))}%`,
                `${Math.round(between(40, 60))}%`,
              ].join(" "),
            }
          : null,
      });
      // 무리 안에서는 좁게 벌린다.
      x += between(3.5, 5.5);
      // 이웃끼리 같은 띠에 서지 않게 번갈아 — 겹침 방지이자 리듬.
      far = !far;
    }
    // 무리 사이는 넓게 — 사이의 모래가 여백이 된다.
    x += between(8, 12);
  }
  return placed;
}

// 借景(차경) — 담 너머로 빌려 온 풍경 (#624, 대표님).
//
// 처음엔 radial-gradient 에 blur 를 먹여 그렸는데 흐린 초록 띠로 뭉개져 나무로
// 읽히지 않았다. 실제 가레산스이에서 담 위로 보이는 건 또렷한 우듬지 실루엣이다.
// 그래서 나무는 SVG 로 윤곽을 그리고, 거리감은 blur 가 아니라 색으로 준다 —
// 먼 숲은 옅고 채도가 낮게, 가까운 나무는 짙고 또렷하게(대기원근).
//
// 나무처럼 보이게 하는 건 결국 두 가지다. 하나는 볼륨 — 우듬지 하나를 단색 원으로
// 두면 종이 오린 것 같아서, 밑동 쪽 그늘과 햇빛 받는 쪽을 같이 얹는다. 다른 하나는
// 불규칙 — 키도 간격도 제각각이어야 하고, 나무가 없는 하늘도 있어야 한다.
//
// 흐림은 다시 얹는다(대표님 #628 — 흐릿한 쪽이 낫다). 다만 예전처럼 흐림으로
// 형태를 만들지는 않는다. 형태는 SVG 가 잡고, 흐림은 그 위에 공기만 얹는 역할이다.
// 그래서 먼 숲은 세게(4.5px), 가까운 나무는 아주 약하게(1.6px) — 거리에 따라
// 다르게 걸어야 흐림이 뭉갬이 아니라 깊이로 읽힌다.
//
// 타일 셋을 돌려 쓰고 홀수 장은 좌우를 뒤집는다. 여섯 장을 가야 같은 그림이
// 돌아오므로 화면 안에서는 반복이 보이지 않는다.

const NEAR = { base: "#4e6139", shade: "#39492b", light: "#657a47" };
const FAR = { base: "#98a68d", shade: "#8b9b7f", light: "#a5b19a" };
const TRUNK = "#4a4034";

type Tone = typeof NEAR;

/* 활엽수 우듬지 — 겹친 원으로 덩어리를 만들고, 아래에 그늘·위에 볕을 얹는다. */
function Crown({ x, y, r, t }: { x: number; y: number; r: number; t: Tone }) {
  return (
    <>
      <g fill={t.base}>
        <circle cx={x} cy={y} r={r} />
        <circle cx={x - r * 0.72} cy={y + r * 0.42} r={r * 0.66} />
        <circle cx={x + r * 0.74} cy={y + r * 0.34} r={r * 0.7} />
        <circle cx={x + r * 0.16} cy={y - r * 0.7} r={r * 0.6} />
      </g>
      <g fill={t.shade}>
        <ellipse cx={x - r * 0.2} cy={y + r * 0.78} rx={r * 0.86} ry={r * 0.42} />
      </g>
      <g fill={t.light}>
        <circle cx={x - r * 0.3} cy={y - r * 0.44} r={r * 0.42} />
        <circle cx={x + r * 0.42} cy={y - r * 0.18} r={r * 0.28} />
      </g>
    </>
  );
}

/* 松 — 층으로 다듬은 소나무. 굽은 줄기와 판처럼 앉은 잎이 이 정원의 얼굴이다. */
function Pine({ x, t }: { x: number; t: Tone }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d="M0 200 C-5 168 12 150 4 122"
        stroke={TRUNK}
        strokeWidth="7"
        fill="none"
      />
      <path d="M5 136 L34 124 M2 112 L-24 106" stroke={TRUNK} strokeWidth="4" />
      <g fill={t.base}>
        <ellipse cx="-18" cy="139" rx="33" ry="11" />
        <ellipse cx="34" cy="122" rx="28" ry="10" />
        <ellipse cx="0" cy="102" rx="25" ry="9" />
        <ellipse cx="14" cy="82" rx="16" ry="7" />
      </g>
      <g fill={t.shade}>
        <ellipse cx="-18" cy="145" rx="27" ry="4" />
        <ellipse cx="34" cy="128" rx="22" ry="4" />
      </g>
      <g fill={t.light}>
        <ellipse cx="-24" cy="134" rx="16" ry="4" />
        <ellipse cx="0" cy="97" rx="13" ry="3.5" />
      </g>
    </g>
  );
}

/* 杉 — 삼나무. 층진 원뿔 하나면 절 마당 냄새가 난다. */
function Cedar({ x, s, t }: { x: number; s: number; t: Tone }) {
  return (
    <g transform={`translate(${x} 200) scale(${s}) translate(0 -200)`}>
      <rect x="-3" y="150" width="6" height="50" fill={TRUNK} />
      <g fill={t.base}>
        <path d="M0 32 L24 94 L-24 94 Z" />
        <path d="M0 68 L34 130 L-34 130 Z" />
        <path d="M0 104 L44 168 L-44 168 Z" />
      </g>
      <g fill={t.shade}>
        <path d="M0 32 L24 94 L0 94 Z" />
        <path d="M0 68 L34 130 L0 130 Z" />
        <path d="M0 104 L44 168 L0 168 Z" />
      </g>
    </g>
  );
}

function Trunk({ x, top }: { x: number; top: number }) {
  return <rect x={x - 4} y={top} width="8" height={200 - top} fill={TRUNK} />;
}

/* ── 가까운 나무 타일 3종 ───────────────────────────────────────────
   좌우 끝(x=0 / x=480)에 같은 나무를 반씩 둬 이음매가 보이지 않게 한다.
   좌우 대칭이라 타일을 뒤집어도 경계가 맞는다. */

function EdgeTree({ t }: { t: Tone }) {
  return (
    <>
      <Trunk x={0} top={126} />
      <Trunk x={480} top={126} />
      <Crown x={0} y={112} r={30} t={t} />
      <Crown x={480} y={112} r={30} t={t} />
    </>
  );
}

function NearA() {
  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" aria-hidden>
      <EdgeTree t={NEAR} />
      <Pine x={82} t={NEAR} />
      <Trunk x={196} top={116} />
      <Crown x={196} y={96} r={42} t={NEAR} />
      {/* 하늘 — 나무가 없는 자리도 풍경이다. */}
      <g fill={NEAR.base}>
        <circle cx="300" cy="184" r="16" />
        <circle cx="318" cy="190" r="12" />
      </g>
      <Cedar x={390} s={0.86} t={NEAR} />
    </svg>
  );
}

function NearB() {
  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" aria-hidden>
      <EdgeTree t={NEAR} />
      <g fill={NEAR.base}>
        <circle cx="72" cy="176" r="24" />
        <circle cx="48" cy="186" r="18" />
      </g>
      <Trunk x={150} top={104} />
      <Crown x={150} y={84} r={48} t={NEAR} />
      <Cedar x={252} s={1} t={NEAR} />
      <Trunk x={352} top={140} />
      <Crown x={352} y={128} r={30} t={NEAR} />
      <Trunk x={430} top={122} />
      <Crown x={430} y={104} r={36} t={NEAR} />
    </svg>
  );
}

function NearC() {
  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" aria-hidden>
      <EdgeTree t={NEAR} />
      <Trunk x={106} top={132} />
      <Crown x={106} y={118} r={33} t={NEAR} />
      <Pine x={236} t={NEAR} />
      <Trunk x={342} top={98} />
      <Crown x={342} y={78} r={45} t={NEAR} />
      <g fill={NEAR.base}>
        <circle cx="418" cy="182" r="19" />
      </g>
    </svg>
  );
}

const NEAR_TILES = [NearA, NearB, NearC];

/* ── 먼 숲 ─────────────────────────────────────────────────────────
   그루가 구분될 필요가 없다. 능선처럼 이어지되 높낮이만 흔들린다. */

function FarA() {
  return (
    <svg viewBox="0 0 620 200" className="h-full w-full" aria-hidden>
      <g fill={FAR.base}>
        <circle cx="0" cy="138" r="34" />
        <circle cx="620" cy="138" r="34" />
        <circle cx="54" cy="128" r="42" />
        <circle cx="104" cy="150" r="30" />
        <circle cx="164" cy="134" r="38" />
        <circle cx="216" cy="152" r="27" />
      </g>
      <Cedar x={296} s={0.78} t={FAR} />
      <g fill={FAR.base}>
        <circle cx="366" cy="130" r="40" />
        <circle cx="418" cy="150" r="29" />
        <circle cx="472" cy="132" r="38" />
        <circle cx="524" cy="152" r="28" />
        <circle cx="574" cy="140" r="32" />
      </g>
      <g fill={FAR.light}>
        <circle cx="44" cy="116" r="18" />
        <circle cx="154" cy="122" r="16" />
        <circle cx="356" cy="118" r="17" />
        <circle cx="462" cy="120" r="16" />
      </g>
    </svg>
  );
}

function FarB() {
  return (
    <svg viewBox="0 0 620 200" className="h-full w-full" aria-hidden>
      <g fill={FAR.base}>
        <circle cx="0" cy="138" r="34" />
        <circle cx="620" cy="138" r="34" />
        <circle cx="60" cy="148" r="30" />
        <circle cx="118" cy="126" r="44" />
        <circle cx="176" cy="148" r="29" />
        <circle cx="232" cy="136" r="36" />
        <circle cx="288" cy="152" r="26" />
        <circle cx="344" cy="132" r="40" />
        <circle cx="402" cy="150" r="28" />
      </g>
      <Cedar x={470} s={0.7} t={FAR} />
      <g fill={FAR.base}>
        <circle cx="540" cy="140" r="34" />
        <circle cx="586" cy="152" r="26" />
      </g>
      <g fill={FAR.light}>
        <circle cx="108" cy="114" r="19" />
        <circle cx="222" cy="124" r="16" />
        <circle cx="334" cy="120" r="17" />
        <circle cx="530" cy="128" r="15" />
      </g>
    </svg>
  );
}

const FAR_TILES = [FarA, FarB];

function Row({
  tiles,
  count,
  ratio,
  className,
}: {
  tiles: readonly (() => React.ReactElement)[];
  count: number;
  ratio: string;
  className: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => {
        const Tile = tiles[i % tiles.length];
        return (
          <span
            key={i}
            className={`block h-full shrink-0 ${ratio}${i % 2 ? " -scale-x-100" : ""}`}
          >
            <Tile />
          </span>
        );
      })}
    </div>
  );
}

export function Shakkei() {
  return (
    <>
      {/* 뒤 숲이 먼저, 앞 나무가 그 위에, 담이 마지막 — 그리는 순서가 곧 거리다. */}
      <Row
        tiles={FAR_TILES}
        count={12}
        ratio="aspect-[31/10]"
        className="garden-far absolute inset-x-0 bottom-[26%] flex h-[44%] items-end"
      />
      <Row
        tiles={NEAR_TILES}
        count={15}
        ratio="aspect-[12/5]"
        className="garden-near absolute inset-x-0 bottom-[26%] flex h-[76%] items-end"
      />

      {/* 아지랑이 — 담에 가까울수록 옅은 빛이 낀다. 흐림만으로는 안 나는 공기다. */}
      <span
        aria-hidden
        className="garden-haze pointer-events-none absolute inset-x-0 bottom-[26%] block h-[52%]"
      />

      {/* 築地塀 — 흙을 다져 올린 담과 그 위의 기와. 담이 정원과 바깥을 가른다. */}
      <div className="garden-wall absolute inset-x-0 bottom-0 h-[32%]">
        <span className="garden-wall-roof absolute inset-x-0 top-0 block h-[26%]" />
      </div>
    </>
  );
}

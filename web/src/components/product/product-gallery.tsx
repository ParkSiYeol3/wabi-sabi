import type { CSSProperties } from "react";
import { ProductImageZoom } from "@/components/product/product-image-zoom";
import { cn } from "@/lib/utils";

// 상품 상세 "나머지" 이미지 배치 (#248 → #609).
//
// 최초 구현은 tableofcraft 를 참고한 무작위 흩뿌림이었다. 폭·좌우 오프셋·간격을
// 슬롯 배열로 돌려쓰기만 해서 "왜 여기 있는가"에 답할 규칙이 없었고, 그래서 남의
// 사이트처럼 보였다(대표님). 不均整(후킨세이)는 무작위가 아니라 "대칭 없이 이룬
// 균형"이다 — 물레에서 일부러 어긋나게 빚은 그릇처럼, 어긋남에 의도가 있어야 한다.
//
// 그래서 규칙이 있는 배치 4안을 두고 고른다(?layout= 로 프리뷰 비교, 대표님 확정 후
// 하나만 남기고 나머지는 지운다).
//   yohaku  余白の柱   — 빈 통로(간)를 페이지에 관통시키고 사진은 그 벽에 붙인다.
//   kizu    器の縁     — 격자는 있으나 미세하게 안 지켜진다(0.4~1.4° 어긋남).
//   johakyu 序破急     — 공간이 아니라 스크롤의 호흡을 구성한다(느림→파격→빠름→침묵).
//   kintsugi 金継ぎ    — 사진 사이 이음을 가는 선으로 드러낸다(대표님이 손으로 그린 곡선).
//   scatter            — 기존 무작위 배치(비교용, 기본값).
//
// 상태 없는 서버 컴포넌트 — 인덱스 기반 결정적이라 SSR 이 흔들리지 않는다.
// 비율은 강제하지 않는다(대표님 — 올린 모양 그대로). 각 사진이 자기 높이를 만든다.

export type GalleryLayout =
  | "scatter"
  | "yohaku"
  | "kizu"
  | "johakyu"
  | "kintsugi";

export const GALLERY_LAYOUTS: GalleryLayout[] = [
  "scatter",
  "yohaku",
  "kizu",
  "johakyu",
  "kintsugi",
];

export function isGalleryLayout(v: unknown): v is GalleryLayout {
  return (
    typeof v === "string" && (GALLERY_LAYOUTS as string[]).includes(v)
  );
}

// 한 장의 기하 — 모바일/데스크톱 각각 폭(w)과 좌측 오프셋(l), 단위 %.
// w + l ≤ 100 을 지켜 가로 넘침이 생기지 않는다.
type Slot = {
  w: number;
  l: number;
  wd: number;
  ld: number;
  // 위 간격(rem 단위 Tailwind 클래스). 첫 장은 무시된다.
  gap: string;
  // 손으로 놓은 어긋남(kizu) — 도(°).
  rot?: number;
};

const slotStyle = (s: Slot): CSSProperties =>
  ({
    "--w": `${s.w}%`,
    "--l": `${s.l}%`,
    "--wd": `${s.wd}%`,
    "--ld": `${s.ld}%`,
  }) as CSSProperties;

// ── ① 기존 무작위(비교용) ─────────────────────────────────────────
const SCATTER: Slot[] = [
  { w: 86, l: 0, wd: 58, ld: 0, gap: "mt-12 md:mt-24" },
  { w: 74, l: 26, wd: 46, ld: 50, gap: "mt-7 md:mt-14" },
  { w: 94, l: 6, wd: 64, ld: 13, gap: "mt-14 md:mt-28" },
  { w: 70, l: 4, wd: 44, ld: 4, gap: "mt-8 md:mt-16" },
  { w: 82, l: 18, wd: 52, ld: 46, gap: "mt-10 md:mt-20" },
  { w: 90, l: 10, wd: 60, ld: 27, gap: "mt-12 md:mt-24" },
];

// ── ② 余白の柱 — 빈 통로가 주인공 ──────────────────────────────────
// 데스크톱: 왼쪽 사진은 44~46% 에서 끝나고 오른쪽 사진은 54~58% 에서 시작한다.
// 그 사이 10% 안팎의 띠가 페이지 끝까지 비어 이어지며 아주 조금씩 흔들린다 —
// 掛軸(족자)의 여백, 間(ma). 사진을 흩는 게 아니라 여백을 깎는 발상이다.
// 모바일은 폭이 좁아 세로 통로를 유지할 수 없어, 좌우 가장자리를 번갈아 붙여
// 여백이 지그재그로 나타나게 한다(같은 원리, 축소판).
const YOHAKU: Slot[] = [
  { w: 78, l: 0, wd: 40, ld: 4, gap: "mt-14 md:mt-28" },
  { w: 70, l: 30, wd: 34, ld: 58, gap: "mt-20 md:mt-40" },
  { w: 84, l: 0, wd: 45, ld: 0, gap: "mt-10 md:mt-20" },
  { w: 68, l: 32, wd: 38, ld: 56, gap: "mt-24 md:mt-48" },
  { w: 74, l: 4, wd: 36, ld: 8, gap: "mt-12 md:mt-24" },
  { w: 80, l: 20, wd: 42, ld: 54, gap: "mt-16 md:mt-32" },
];

// ── ③ 器の縁 — 손으로 놓은 어긋남 ──────────────────────────────────
// 격자는 분명히 있는데 미세하게 안 지켜진다. 손물레 그릇 테두리가 완전한 원이
// 아닌 것과 같다. 큰 혼돈보다 "거의 맞았는데 살짝 틀어진 것"이 더 侘寂하다.
const KIZU: Slot[] = [
  { w: 84, l: 2, wd: 50, ld: 24, gap: "mt-10 md:mt-20", rot: 0.8 },
  { w: 82, l: 5, wd: 52, ld: 26, gap: "mt-11 md:mt-22", rot: -1.1 },
  { w: 84, l: 2, wd: 49, ld: 23, gap: "mt-9 md:mt-20", rot: 0.5 },
  { w: 83, l: 4, wd: 51, ld: 27, gap: "mt-11 md:mt-21", rot: -0.7 },
  { w: 85, l: 3, wd: 50, ld: 25, gap: "mt-10 md:mt-20", rot: 1.2 },
  { w: 82, l: 6, wd: 52, ld: 24, gap: "mt-10 md:mt-20", rot: -0.4 },
];

// ── ④ 序破急 — 스크롤의 호흡 ───────────────────────────────────────
// 공간이 아니라 시간을 구성한다. 序(느림: 큰 한 장 + 넉넉한 여백) → 破(파격:
// 사진이 몰리고 좌우로 벌어짐) → 急(빠름: 작게 촘촘) → 끝에 긴 침묵.
// 장수에 따라 구간이 갈리므로 인덱스 나머지가 아니라 진행도로 슬롯을 고른다.
const JO: Slot[] = [
  { w: 92, l: 0, wd: 64, ld: 18, gap: "mt-14 md:mt-28" },
  { w: 88, l: 6, wd: 60, ld: 22, gap: "mt-24 md:mt-48" },
];
const HA: Slot[] = [
  { w: 62, l: 0, wd: 40, ld: 2, gap: "mt-8 md:mt-16" },
  { w: 58, l: 40, wd: 36, ld: 60, gap: "mt-4 md:mt-8" },
  { w: 66, l: 6, wd: 42, ld: 10, gap: "mt-5 md:mt-10" },
  { w: 60, l: 36, wd: 38, ld: 55, gap: "mt-4 md:mt-8" },
];
const KYU: Slot[] = [
  { w: 46, l: 4, wd: 24, ld: 12, gap: "mt-6 md:mt-12" },
  { w: 42, l: 30, wd: 22, ld: 40, gap: "mt-3 md:mt-6" },
  { w: 44, l: 54, wd: 23, ld: 66, gap: "mt-3 md:mt-6" },
];

function johakyuSlot(i: number, n: number): Slot {
  // 序 = 앞 1/3(최소 1장), 急 = 뒤 1/3, 나머지가 破.
  const jo = Math.max(1, Math.round(n / 3));
  const kyu = n - Math.max(1, Math.round(n / 3));
  if (i < jo) return JO[i % JO.length];
  if (i >= kyu) return KYU[(i - kyu) % KYU.length];
  return HA[(i - jo) % HA.length];
}

// ── ⑤ 金継ぎ — 이음을 드러낸다 ─────────────────────────────────────
// 대표님이 스크린샷에 손으로 그린 곡선. 깨진 자리를 금으로 이어 붙여 흔적을
// 오히려 드러내는 킨츠기처럼, 사진과 사진 사이의 "건너뜀"을 가는 선으로 보여준다.
// 배치는 余白の柱 를 그대로 쓴다 — 선이 지날 거리가 있어야 곡선이 산다.
const KINTSUGI = YOHAKU;

// 두 장 사이를 잇는 S 곡선. 다음 장이 오른쪽에 있으면 이전 장의 오른쪽 아래에서
// 출발해 다음 장의 왼쪽 위로, 왼쪽에 있으면 그 반대로 — 손으로 그은 궤적처럼.
// viewBox 를 0~100 으로 두고 preserveAspectRatio="none" 으로 늘리되, 선 굵기는
// vector-effect 로 고정해 늘어나도 머리카락 굵기를 유지한다.
function Seam({ from, to }: { from: Slot; to: Slot }) {
  const path = (a: Slot, b: Slot) => {
    const rightward = b.l > a.l;
    const x1 = rightward ? a.l + a.w : a.l;
    const x2 = rightward ? b.l : b.l + b.w;
    // 제어점을 위·아래로 깊게 잡아 대표님이 그린 것처럼 완만한 S 로 휘게 한다.
    return `M ${x1} 0 C ${x1} 84, ${x2} 16, ${x2} 100`;
  };
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none h-20 w-full text-wabi-fg/30 md:h-40"
    >
      {/* 모바일·데스크톱 기하가 달라 두 경로를 겹쳐 두고 화면폭으로 하나만 보인다 */}
      <path
        d={path(
          { ...from, l: from.l, w: from.w },
          { ...to, l: to.l, w: to.w },
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="md:hidden"
      />
      <path
        d={path(
          { ...from, l: from.ld, w: from.wd },
          { ...to, l: to.ld, w: to.wd },
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="hidden md:block"
      />
    </svg>
  );
}

function slotsFor(layout: GalleryLayout, n: number): Slot[] {
  const table =
    layout === "yohaku"
      ? YOHAKU
      : layout === "kizu"
        ? KIZU
        : layout === "kintsugi"
          ? KINTSUGI
          : SCATTER;
  if (layout === "johakyu")
    return Array.from({ length: n }, (_, i) => johakyuSlot(i, n));
  return Array.from({ length: n }, (_, i) => table[i % table.length]);
}

export function ProductGallery({
  images,
  name,
  layout = "scatter",
}: {
  images: string[];
  name: string;
  layout?: GalleryLayout;
}) {
  if (images.length === 0) return null;

  const slots = slotsFor(layout, images.length);
  const seams = layout === "kintsugi";

  return (
    <div
      className={cn(
        "mt-10 md:mt-16",
        // 序破急 은 마지막에 긴 침묵을 둔다 — 리듬의 마침.
        layout === "johakyu" && "pb-24 md:pb-48",
      )}
    >
      {images.map((src, i) => {
        const s = slots[i];
        return (
          <div key={i}>
            {/* 이음선은 사진 사이에만 — 첫 장 위에는 두지 않는다. */}
            {seams && i > 0 && <Seam from={slots[i - 1]} to={s} />}
            <div
              style={slotStyle(s)}
              className={cn(
                "wabi-slot relative",
                // 이음선이 간격을 대신하므로 그 층은 간격을 줄인다.
                i === 0 ? "" : seams ? "mt-2 md:mt-4" : s.gap,
              )}
            >
              <div
                style={s.rot ? { rotate: `${s.rot}deg` } : undefined}
                className="origin-center bg-wabi-muted"
              >
                <ProductImageZoom
                  src={src}
                  alt={`${name} 상세 이미지 ${i + 1}`}
                  sizes="(max-width: 768px) 94vw, 60vw"
                  natural
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

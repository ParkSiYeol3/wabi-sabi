"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// 홈 "하루의 결" 헬릭스 여정 (#197, 대표님 피드백 — 클로드 디자인 목업 v2 이식).
// 시간 축(수직 점선)을 따라 흐르는 나선 곡선이 스크롤에 맞춰 그려지고, 곡선 위
// 모멘트(아침~저녁)마다 실상품 카드가 자연스레 등장했다가 지나가면 옅어진다.
//
// - 목업은 3.2s 고정 드로잉 애니메이션 → 여기선 스크롤 스크럽(대표님 "선을 따라
//   스크롤" 요구). passive scroll + rAF, 상태 없이 ref 직접 조작(프레임당 리렌더 0).
// - prefers-reduced-motion: 스크럽 없이 완성된 선 + 카드 전부 표시.
// - 데스크톱/모바일 SVG 를 각각 프리렌더(CSS 로 전환) — JS 분기가 없어 하이드레이션
//   레이아웃 시프트가 없다. 모바일은 세로 피치를 늘려 카드 간격을 확보한다.

export type JourneyMoment = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  comment: string | null; // 상품 한 줄 코멘트(설명 첫 문장)
  label: string; // 아침 · morning
};

// 상품 설명이 없을 때의 모멘트 기본 코멘트 — 시적 한 문장.
export const MOMENT_COMMENTS = [
  "하루의 시작을 조용히 담아내는 그릇.",
  "김이 오르는 잠깐, 손안의 온기.",
  "평범한 점심을 조금 특별하게.",
  "느린 오후의 결을 닮은 물건.",
  "하루의 끝, 식탁 위의 고요.",
] as const;

// 곡선 극점(좌우 교차)과 만나는 지점(%) — 나선 파라미터(3.5바퀴)에서 유도.
// 데스크톱·모바일 캔버스가 시작/끝 여백 비율을 공유해 좌표가 둘 다 극점에 맞는다.
const MOMENT_POS = [
  { x: 71, y: 30.3 },
  { x: 29, y: 43.4 },
  { x: 71, y: 56.6 },
  { x: 29, y: 69.8 },
  { x: 71, y: 83.0 },
] as const;

export const MOMENT_LABELS = [
  "아침 · morning",
  "차 한 잔 · a cup of tea",
  "점심 · midday",
  "오후 · afternoon",
  "저녁 · evening",
] as const;

// 나선 경로 — 결정적 계산이라 SSR/클라 동일(하이드레이션 안전).
function helixPath(
  cx: number,
  R: number,
  rY: number,
  yStart: number,
  yEnd: number,
  loops: number,
  steps: number,
): string {
  const tMax = Math.PI * 2 * loops;
  const pitch = (yEnd - yStart) / tMax;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (tMax * i) / steps;
    const x = cx + R * Math.cos(t);
    const y = yStart + pitch * t + rY * Math.sin(t);
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d.trim();
}

// 곡선을 길게(#197 피드백 5차) — 앞 카드가 완전히 사라진 뒤 다음 카드가 시작되게
// 카드 간 스크롤 간격 > 등장 구간이 되도록 잡는다. 시작/끝 여백은 두 캔버스가
// 같은 비율(3.9%/3.5%)을 쓰므로 MOMENT_POS 가 양쪽 모두 극점에 맞는다.
const DESKTOP = { vb: "0 0 1000 4600", d: helixPath(500, 210, 55, 180, 4440, 3.5, 720) };
const MOBILE = { vb: "0 0 1000 9600", d: helixPath(500, 170, 80, 376, 9266, 3.5, 720) };

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function HelixJourney({ moments }: { moments: JourneyMoment[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const momentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const paths = pathRefs.current.filter(Boolean) as SVGPathElement[];
    const lens = paths.map((p) => p.getTotalLength());

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // 완성 상태 고정 — 모션 없이 전부 보이게.
      paths.forEach((p) => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
      });
      momentRefs.current.forEach((m) => {
        if (m) {
          m.style.opacity = "1";
          m.style.transform = "translateY(-50%)";
          m.style.pointerEvents = "auto";
        }
      });
      dotRefs.current.forEach((d) => {
        if (d) d.style.opacity = "1";
      });
      return;
    }

    // 마우스 휠은 터치패드보다 스크롤 델타가 커서 연출이 뚝뚝 끊긴다(#197 피드백
    // 5차). 스크롤 자체를 가로채는 대신(UX·접근성 해악) 연출이 따라오는 위치를
    // lerp 로 완만하게 쫓게 한다 — 휠로 확 내려도 선·카드는 스르륵 따라잡는다.
    let raf = 0;
    let targetTop = 0; // 실제 rect.top
    let curTop = 0; // 연출용 스무딩된 rect.top
    let height = 1;
    let vh = window.innerHeight;

    const render = (top: number) => {
      paths.forEach((el, i) => {
        const p = clamp01((vh * 0.85 - top) / height);
        el.style.strokeDasharray = `${lens[i]}`;
        el.style.strokeDashoffset = `${lens[i] * (1 - p)}`;
      });

      momentRefs.current.forEach((m, i) => {
        if (!m) return;
        // 뷰포트 중앙 기준 종형 — 점이 화면 아래면 0, 중앙에서 최대, 지나가면
        // 다시 소멸. 구간(±0.32vh)이 카드 간 스크롤 간격보다 좁아 앞 카드가
        // 완전히 사라진 뒤에야 다음 카드가 나타난다.
        const dotY = top + (MOMENT_POS[i].y / 100) * height;
        const dist = Math.abs(dotY - vh * 0.5) / (vh * 0.32);
        const vis = clamp01(1 - dist);
        m.style.opacity = vis.toFixed(3);
        m.style.transform = `translateY(-50%) scale(${(0.78 + 0.22 * vis).toFixed(3)})`;
        // 사라진 카드가 보이지 않는 클릭 함정이 되지 않게.
        m.style.pointerEvents = vis < 0.1 ? "none" : "auto";
        const dot = dotRefs.current[i];
        if (dot) dot.style.opacity = vis.toFixed(3); // 점도 함께 — 시작은 곡선만
      });
    };

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      targetTop = rect.top;
      height = rect.height;
      vh = window.innerHeight;
    };

    const tick = () => {
      curTop += (targetTop - curTop) * 0.11; // 60fps 기준 ~0.4s 에 수렴
      if (Math.abs(targetTop - curTop) < 0.5) curTop = targetTop;
      render(curTop);
      raf = curTop === targetTop ? 0 : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measure();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // 첫 렌더(중간 로드 포함)는 스무딩 없이 현재 위치로 즉시 동기화.
    measure();
    curTop = targetTop;
    render(curTop);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-265 px-3">
      {/* 데스크톱/모바일 캔버스 — CSS 로만 전환(레이아웃 시프트 없음) */}
      {[
        { cfg: DESKTOP, cls: "hidden md:block", key: "d" },
        { cfg: MOBILE, cls: "md:hidden", key: "m" },
      ].map(({ cfg, cls, key }, pi) => (
        <svg
          key={key}
          viewBox={cfg.vb}
          className={`${cls} h-auto w-full overflow-visible`}
          aria-hidden
        >
          {/* 곡선만 — 축·화살표·시어 없이 스크롤이 그리는 선 하나 (#197 피드백 3차) */}
          <path
            ref={(el) => {
              pathRefs.current[pi] = el;
            }}
            d={cfg.d}
            fill="none"
            stroke="#423c30"
            strokeWidth="1.3"
            style={{ strokeDasharray: 12000, strokeDashoffset: 12000 }}
          />
        </svg>
      ))}

      {/* 모멘트 — 곡선 위 점 + 반대편 여백에 상품 카드 (#197 피드백).
          점이 오른쪽 극점(71%)이면 왼쪽 빈 공간에, 왼쪽 극점이면 오른쪽에 —
          곡선과 겹치지 않는 넓은 여백에서 사진+한 줄 코멘트가 커졌다 작아진다. */}
      {moments.slice(0, MOMENT_POS.length).map((m, i) => {
        const pos = MOMENT_POS[i];
        const cardLeft = pos.x > 50; // 점이 오른쪽 → 카드는 왼쪽 여백
        return (
          <div key={m.id}>
            <div
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#423c30]"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: 0 }}
            />
            <div
              ref={(el) => {
                momentRefs.current[i] = el;
              }}
              className={`absolute w-[44%] max-w-75 md:w-[36%] ${
                cardLeft
                  ? "left-[3%] text-right md:left-[7%]"
                  : "right-[3%] text-left md:right-[7%]"
              }`}
              style={{
                top: `${pos.y}%`,
                opacity: 0,
                transform: "translateY(-50%) scale(0.78)",
              }}
            >
              <div className="mb-2 [font-family:var(--ws-serif)] italic text-[13px] text-[#8f8676] md:mb-3 md:text-[16px]">
                {m.label}
              </div>
              <Link href={`/shop/${m.id}`} className="block">
                <div className="relative flex aspect-5/4 items-center justify-center overflow-hidden rounded-[50%/42%] border border-[rgba(66,60,48,.16)] bg-[repeating-linear-gradient(48deg,#e7dcc8_0_1px,#efe6d5_1px_12px)]">
                  {m.image ? (
                    <Image
                      src={m.image}
                      alt={m.name}
                      fill
                      sizes="(max-width: 768px) 44vw, 300px"
                      className="object-cover"
                    />
                  ) : (
                    <>
                      <div className="h-2/5 w-[44%] rounded-full bg-[radial-gradient(circle_at_42%_38%,rgba(66,60,48,.24),transparent_68%)] blur-lg" />
                      <span className="absolute bottom-2 [font-family:var(--ws-mono)] text-[8px] tracking-[1px] text-[#a39a88]">
                        [ product shot ]
                      </span>
                    </>
                  )}
                </div>
                {/* 한 줄 코멘트 — 상품 설명 첫 문장, 없으면 모멘트 기본 문장 */}
                <p className="mt-3 [font-family:var(--ws-serif)] italic text-[13px] leading-normal text-[#6b6353] md:text-[16px]">
                  {m.comment ?? MOMENT_COMMENTS[i] ?? ""}
                </p>
                <div
                  className={`mt-2 flex items-baseline justify-between gap-2 ${
                    cardLeft ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="truncate [font-family:var(--ws-serif)] text-[16px] text-[#423c30] md:text-[21px]">
                    {m.name}
                  </span>
                  <span className="shrink-0 [font-family:var(--ws-mono)] text-[10px] text-[#6b6353] md:text-[11px]">
                    {won(m.price)}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        );
      })}

    </div>
  );
}

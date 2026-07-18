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
  label: string; // 아침 · morning
};

// 목업 좌표 — 곡선(helix)과 만나는 지점(%). 좌우 교차.
const MOMENT_POS = [
  { x: 71, y: 30 },
  { x: 29, y: 44 },
  { x: 71, y: 57 },
  { x: 29, y: 70 },
  { x: 71, y: 83 },
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

const DESKTOP = { vb: "0 0 1000 2600", d: helixPath(500, 210, 55, 180, 2440, 3.5, 720), axis: 2470 };
const MOBILE = { vb: "0 0 1000 5200", d: helixPath(500, 170, 80, 260, 4980, 3.5, 720), axis: 5060 };

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function HelixJourney({ moments }: { moments: JourneyMoment[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const momentRefs = useRef<(HTMLDivElement | null)[]>([]);

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
          m.style.transform = "none";
        }
      });
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      // 캔버스가 뷰포트를 통과하는 진행도 — 하단 15% 지점 기준.
      const p = clamp01((vh * 0.85 - rect.top) / rect.height);

      paths.forEach((el, i) => {
        el.style.strokeDasharray = `${lens[i]}`;
        el.style.strokeDashoffset = `${lens[i] * (1 - p)}`;
      });

      momentRefs.current.forEach((m, i) => {
        if (!m) return;
        const y = MOMENT_POS[i].y / 100;
        // 곡선이 도달하기 직전 등장, 한참 지나면 여운만 남기고 옅어진다.
        const fadeIn = clamp01((p - (y - 0.1)) / 0.08);
        const fadeOut = 1 - clamp01((p - (y + 0.16)) / 0.12) * 0.7;
        m.style.opacity = `${(fadeIn * fadeOut).toFixed(3)}`;
        m.style.transform = `translateY(${((1 - fadeIn) * 14).toFixed(1)}px)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update(); // 중간 로드(새로고침)에서도 현재 스크롤 기준으로 즉시 동기화
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-[1060px] px-3">
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
          {/* 시간 축 */}
          <line
            x1="500"
            y1="150"
            x2="500"
            y2={cfg.axis}
            stroke="#423c30"
            strokeWidth="1"
            strokeDasharray="1 6"
            opacity="0.55"
          />
          <path
            d={`M500 150 L493 172 M500 150 L507 172`}
            fill="none"
            stroke="#423c30"
            strokeWidth="1.1"
          />
          {/* 하루의 흐름 — 스크롤이 그리는 선 */}
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

      {/* 흐르는 시어 — 스크롤 중에 만나는 무드 요소(진입 화면엔 곡선만) */}
      <div className="absolute left-[60%] top-[24%] rotate-[-4deg] [font-family:var(--ws-serif)] italic text-[16px] text-[#8f8676] md:text-[20px]">
        천천히
      </div>
      <div className="absolute left-[22%] top-[51%] rotate-3 [font-family:var(--ws-serif)] italic text-[16px] text-[#8f8676] md:left-[30%] md:text-[20px]">
        결을 따라
      </div>
      <div className="absolute left-[56%] top-[74%] -rotate-3 [font-family:var(--ws-serif)] italic text-[16px] text-[#8f8676] md:text-[20px]">
        곁에
      </div>
      <div className="absolute left-[47%] top-[90%] origin-left -rotate-90 [font-family:var(--ws-mono)] text-[9px] tracking-[2px] text-[#9a9080] md:text-[10px]">
        a day
      </div>

      {/* 모멘트 — 점 + 상품 카드 (좌우 교차) */}
      {moments.slice(0, MOMENT_POS.length).map((m, i) => {
        const pos = MOMENT_POS[i];
        const right = pos.x > 50; // 카드가 점의 오른쪽에 붙는지
        return (
          <div key={m.id}>
            <div
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#423c30]"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
            <div
              ref={(el) => {
                momentRefs.current[i] = el;
              }}
              className={`absolute w-[38vw] max-w-46.5 -translate-y-1/2 transition-none ${
                right ? "text-left" : "text-right"
              }`}
              style={{
                top: `${pos.y}%`,
                ...(right
                  ? { left: `calc(${pos.x}% + 16px)` }
                  : { right: `calc(${100 - pos.x}% + 16px)` }),
                opacity: 0,
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
                      sizes="(max-width: 768px) 38vw, 186px"
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
                <div
                  className={`mt-2 flex items-baseline justify-between gap-2 ${
                    right ? "" : "flex-row-reverse"
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

      {/* 종착 노드 */}
      <div className="absolute left-1/2 top-[95.5%] flex h-22 w-22 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dotted border-[rgba(66,60,48,.5)] bg-[#f3ebdd] text-center md:h-26 md:w-26">
        <span className="[font-family:var(--ws-serif)] italic text-[13px] leading-[1.2] text-[#423c30] md:text-[15px]">
          당신의
          <br />
          식탁
        </span>
      </div>

      {/* 캡션 */}
      <div className="absolute -bottom-2 left-0 [font-family:var(--ws-serif)] italic text-[13px] text-[#8f8676] md:text-[15px]">
        / 하루의 결 · the grain of a day /
      </div>
    </div>
  );
}

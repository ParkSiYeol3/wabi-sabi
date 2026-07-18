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

const DESKTOP = { vb: "0 0 1000 2600", d: helixPath(500, 210, 55, 180, 2440, 3.5, 720) };
const MOBILE = { vb: "0 0 1000 5200", d: helixPath(500, 170, 80, 260, 4980, 3.5, 720) };

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
          m.style.transform = "translateY(-50%)";
          m.style.pointerEvents = "auto";
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
        const d = p - MOMENT_POS[i].y / 100; // 모멘트 지점까지의 거리
        // 종형 곡선(#197 피드백) — 다가오면 서서히 커지며 나타나고,
        // 지나가면 서서히 작아지며 완전히 사라진다.
        const vis =
          clamp01((d + 0.14) / 0.1) * (1 - clamp01((d - 0.02) / 0.12));
        m.style.opacity = vis.toFixed(3);
        m.style.transform = `translateY(-50%) scale(${(0.78 + 0.22 * vis).toFixed(3)})`;
        // 사라진 카드가 보이지 않는 클릭 함정이 되지 않게.
        m.style.pointerEvents = vis < 0.1 ? "none" : "auto";
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
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#423c30]"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
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

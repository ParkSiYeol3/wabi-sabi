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

// 곡선 극점(좌우 교차)과 만나는 지점(%) — 나선 7.5바퀴의 k=3·6·9·12·15번째
// 반바퀴 극점(sin=0, cos=∓1). 데스크톱·모바일 캔버스가 시작(3.75%)/끝 여백
// 비율과 반지름(260)을 공유해 좌표가 둘 다 극점에 정확히 맞는다.
const MOMENT_POS = [
  { x: 18, y: 21.5 },
  { x: 82, y: 39.25 },
  { x: 18, y: 57.0 },
  { x: 82, y: 74.75 },
  { x: 18, y: 92.5 },
] as const;

export const MOMENT_LABELS = [
  "아침 · morning",
  "차 한 잔 · a cup of tea",
  "점심 · midday",
  "오후 · afternoon",
  "저녁 · evening",
] as const;

// 입체 스프링 나선 (#213, 대표님 피드백 — 평면 S커브가 아닌 3D 코일).
// 나선을 앞면/뒷면 반바퀴 세그먼트로 쪼갠다: 뒷면(sin<0)은 옅고 가늘게, 앞면이
// 교차점에서 덮으며(SVG 뒤→앞 순서) 입체감이 생긴다. 세그먼트 길이는 폴리라인
// 현(chord) 합 — 브라우저의 path 길이와 정확히 일치하므로 DOM 측정이 필요 없다.
// 결정적 계산이라 SSR/클라 동일(하이드레이션 안전).
type HelixSeg = { d: string; front: boolean; len: number; cum: number };
type HelixGeom = { segs: HelixSeg[]; total: number };

function helixSegments(
  cx: number,
  R: number,
  rY: number,
  yStart: number,
  yEnd: number,
  loops: number,
  steps: number,
): HelixGeom {
  const tMax = Math.PI * 2 * loops;
  const pitch = (yEnd - yStart) / tMax;
  const pt = (i: number) => {
    const t = (tMax * i) / steps;
    return {
      x: cx + R * Math.cos(t),
      y: yStart + pitch * t + rY * Math.sin(t),
      front: Math.sin(t) >= -1e-9, // 화면 아래로 볼록한 반바퀴 = 앞면
    };
  };

  const segs: HelixSeg[] = [];
  let cum = 0;
  let cur = [pt(0)];
  for (let i = 1; i <= steps; i++) {
    const p = pt(i);
    cur.push(p);
    const boundary = p.front !== cur[0].front;
    if (boundary || i === steps) {
      let len = 0;
      let d = `M${cur[0].x.toFixed(1)} ${cur[0].y.toFixed(1)} `;
      for (let j = 1; j < cur.length; j++) {
        len += Math.hypot(cur[j].x - cur[j - 1].x, cur[j].y - cur[j - 1].y);
        d += `L${cur[j].x.toFixed(1)} ${cur[j].y.toFixed(1)} `;
      }
      segs.push({ d: d.trim(), front: cur[0].front, len, cum });
      cum += len;
      cur = [p]; // 경계점을 다음 세그먼트 시작점으로 공유(끊김 없음)
    }
  }
  return { segs, total: cum };
}

// "원통을 감싸는" 코일로 보이려면 한 화면에 고리가 1.5~2개는 보여야 한다(#213 2차)
// — 3.5바퀴/캔버스에선 바퀴당 세로 1200px 라 화면(~900px)엔 늘 반 바퀴 미만만
// 보여 지그재그로 읽혔다. 7.5바퀴로 촘촘하게(바퀴당 ~550u), 반지름 320·타원
// 진폭 95(카드 상하 클리어런스) 로 넓게 감싼다(#213 3차 — 시열님: 더 넓은 반경). 두 캔버스는 반지름과 시작/끝 여백 비율을
// 공유해 MOMENT_POS 가 동일하게 맞는다. 카드 간격(17.75%)은 등장 구간보다 넓다.
const DESKTOP = { vb: "0 0 1000 4800", geom: helixSegments(500, 320, 95, 180, 4440, 7.5, 480) };
const MOBILE = { vb: "0 0 1000 10000", geom: helixSegments(500, 320, 95, 375, 9250, 7.5, 480) };

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// 캔버스 2개(데스크톱·모바일)의 세그먼트 지오메트리 — 효과 루프가 참조.
const CANVASES = [DESKTOP, MOBILE];

export function HelixJourney({ moments }: { moments: JourneyMoment[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // segRefs[캔버스][세그먼트] — cfg.geom.segs 와 같은 인덱스.
  const segRefs = useRef<(SVGPathElement | null)[][]>([[], []]);
  const momentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // 완성 상태 고정 — 모션 없이 전부 보이게.
      segRefs.current.flat().forEach((p) => {
        if (p) {
          p.style.strokeDasharray = "none";
          p.style.strokeDashoffset = "0";
        }
      });
      momentRefs.current.forEach((m) => {
        if (m) {
          m.style.opacity = "1";
          m.style.transform = "translateY(-50%)";
          m.style.pointerEvents = "auto";
          m.removeAttribute("inert");
        }
      });
      dotRefs.current.forEach((d) => {
        if (d) d.style.opacity = "1";
      });
      return;
    }

    // 휠 스무스 스크롤(SmoothScroll)이 페이지 이동 자체를 이징하므로 연출은
    // 현재 스크롤을 그대로 따른다(이중 스무딩 금지 — 겹치면 둥둥 뜨는 랙).
    //
    // 진입 드로잉(#211 피드백): 스크럽만 있으면 첫 화면에서 선이 "이미 그려진
    // 상태"로 시작한다 — 목업의 로드 애니메이션처럼 0에서부터 ease-out 으로
    // 그려진 뒤 스크럽에 자연 인계한다(선만 — 카드는 즉시 정확 추종).
    const INTRO_MS = 2600;
    const introT0 = performance.now();
    let introDone = false;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    let raf = 0;
    let height = 1;
    let vh = window.innerHeight;

    const render = (top: number) => {
      const k = introDone
        ? 1
        : easeOut(Math.min(1, (performance.now() - introT0) / INTRO_MS));
      if (k >= 1) introDone = true;
      const p = clamp01((vh * 0.85 - top) / height) * k;
      CANVASES.forEach((cfg, ci) => {
        const drawn = p * cfg.geom.total;
        cfg.geom.segs.forEach((seg, si) => {
          const el = segRefs.current[ci][si];
          if (!el) return;
          // 전체 진행 길이를 세그먼트 구간으로 환산 — 누적 순서대로 이어 그려진다.
          const local = clamp01((drawn - seg.cum) / seg.len);
          el.style.strokeDasharray = `${seg.len}`;
          el.style.strokeDashoffset = `${seg.len * (1 - local)}`;
        });
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
        // 사라진 카드가 보이지 않는 클릭·포커스 함정이 되지 않게 —
        // pointer-events 는 포인터만 막으므로 inert 로 키보드 탭·접근성
        // 트리에서도 함께 제외한다(CodeRabbit #198).
        m.style.pointerEvents = vis < 0.1 ? "none" : "auto";
        m.toggleAttribute("inert", vis < 0.1);
        const dot = dotRefs.current[i];
        if (dot) dot.style.opacity = vis.toFixed(3); // 점도 함께 — 시작은 곡선만
      });
    };

    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      height = rect.height;
      vh = window.innerHeight;
      render(rect.top);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update(); // 중간 로드(새로고침)에서도 현재 스크롤 기준으로 즉시 동기화
    // 진입 드로잉 동안만 도는 rAF — 완료되면 자동 정지(이후는 스크롤 이벤트만).
    const introTick = () => {
      update();
      if (!introDone) requestAnimationFrame(introTick);
    };
    requestAnimationFrame(introTick);
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
          {/* 입체 스프링(#213) — 뒷면(옅고 가늘게)을 먼저, 앞면이 교차점에서 덮는다.
              각 세그먼트는 자기 길이만큼의 dash 로 숨겨져 있다가 누적 순서대로 그려진다. */}
          {[false, true].map((frontPass) =>
            cfg.geom.segs.map((seg, si) =>
              seg.front === frontPass ? (
                <path
                  key={si}
                  ref={(el) => {
                    segRefs.current[pi][si] = el;
                  }}
                  d={seg.d}
                  fill="none"
                  stroke="#423c30"
                  strokeWidth={seg.front ? 1.3 : 1.6}
                  opacity={seg.front ? 1 : 0.45}
                  style={{
                    strokeDasharray: seg.len,
                    strokeDashoffset: seg.len,
                  }}
                />
              ) : null,
            ),
          )}
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
              // 크림 배경 패딩 — 넓은 코일과 불가피하게 교차하는 구간에서 선이
              // 카드(종이) 밑으로 깔끔히 들어간다(#213 4차: 사진과 선 겹침 제거).
              className={`absolute w-[44%] max-w-75 bg-[#f3ebdd] p-3 md:w-[36%] md:p-4 ${
                cardLeft
                  ? "left-[3%] text-right md:left-[7%]"
                  : "right-[3%] text-left md:right-[7%]"
              }`}
              style={{
                top: `${pos.y}%`,
                opacity: 0,
                transform: "translateY(-50%) scale(0.78)",
              }}
              // 초기(숨김) 상태 — JS 로드 전에도 키보드·스크린리더에서 제외
              inert
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

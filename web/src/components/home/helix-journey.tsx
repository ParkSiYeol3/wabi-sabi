"use client";

import { useEffect, useRef } from "react";

// 홈 "하루의 결" 헬릭스 여정 (#197, 대표님 피드백 — 클로드 디자인 목업 v2 이식).
// 나선 곡선이 스크롤에 맞춰 그려지고, 곡선 극점의 여백 포켓에서 브랜드 철학
// 멘트(侘·寂·選)가 자연스레 등장했다가 지나가면 옅어진다(#225 — 상품 카드 대체).
//
// - 목업은 3.2s 고정 드로잉 애니메이션 → 여기선 스크롤 스크럽(대표님 "선을 따라
//   스크롤" 요구). passive scroll + rAF, 상태 없이 ref 직접 조작(프레임당 리렌더 0).
// - prefers-reduced-motion: 스크럽 없이 완성된 선 + 멘트 전부 표시.
// - 데스크톱/모바일 SVG 를 각각 프리렌더(CSS 로 전환) — JS 분기가 없어 하이드레이션
//   레이아웃 시프트가 없다. 모바일은 세로 피치를 늘려 멘트 간격을 확보한다.

// 侘·寂·選 — 브랜드 철학 3주. 곡선 여정 안에서 등장한다(#225, 대표님 피드백 —
// "카드 대신 저 멘트들"). 엔딩 그리드에 있던 내용을 이곳으로 옮겼다(중복 금지).
const PILLARS = [
  {
    han: "侘",
    label: "01 — 와비 / WABI",
    body: "소박함과 절제. 덜어낼수록 선명해지는 본질을 담습니다.",
  },
  {
    han: "寂",
    label: "02 — 사비 / SABI",
    body: "시간의 흔적. 낡음과 결이 만드는 고요한 깊이를 아낍니다.",
  },
  {
    han: "選",
    label: "03 — 큐레이션 / SELECT",
    body: "오래 곁에 둘 것만을. 만든 이와 쓰는 이의 하루를 잇습니다.",
  },
] as const;

// 멘트 = 나선 10바퀴의 극점 k=5(좌)·12(우)·19(좌) — 3주(#225)라 간격을
// 7반바퀴로 넓혔다(홀수 간격 = 좌우 교차 유지). 테이퍼라 극점 x 가 층마다
// 다르다: x = 50 ∓ R(k)/10, R(k)=300+6.5k. y 는 여백비를 두 캔버스가
// 공유하므로 동일: y% = (yStart + (yEnd−yStart)·k/20) / vbH.
// 첫 1/3은 곡선만 흐르는 빌드업, 마지막(94.2%)은 카드 시절 확정된 종점 유지.
const MOMENT_POS = [
  { x: 16.8, y: 27.6 },
  { x: 87.8, y: 60.9 },
  { x: 7.7, y: 94.2 },
] as const;

// 입체 스프링 나선 (#213, 대표님 피드백 — 평면 S커브가 아닌 3D 코일).
// 나선을 앞면/뒷면 반바퀴 세그먼트로 쪼개 누적 순서로 이어 그린다. 선 자체는
// 색·굵기 완전 균일(#213 5차 — 옅기 차이가 얼룩처럼 보임) — 입체감은 교차
// 기하만으로 낸다(레퍼런스와 동일). 세그먼트 길이는 폴리라인
// 현(chord) 합 — 브라우저의 path 길이와 정확히 일치하므로 DOM 측정이 필요 없다.
// 결정적 계산이라 SSR/클라 동일(하이드레이션 안전).
type HelixSeg = { d: string; front: boolean; len: number; cum: number };
type HelixGeom = { segs: HelixSeg[]; total: number };

function helixSegments(
  cx: number,
  rTop: number,
  rBot: number,
  rYRatio: number, // 타원 세로/가로 비 — 원근(약 0.32~0.38)
  yStart: number,
  yEnd: number,
  loops: number,
  steps: number,
): HelixGeom {
  const tMax = Math.PI * 2 * loops;
  const pitch = (yEnd - yStart) / tMax;
  const pt = (i: number) => {
    const t = (tMax * i) / steps;
    // 원뿔형(#213 7차, 레퍼런스) — 위 고리는 작고 아래로 갈수록 넓어진다.
    const R = rTop + (rBot - rTop) * (t / tMax);
    return {
      x: cx + R * Math.cos(t),
      y: yStart + pitch * t + R * rYRatio * Math.sin(t),
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
// 보여 지그재그로 읽혔다. 7.5바퀴로 촘촘하게(바퀴당 ~550u).
// 반지름 280(5차 — 320은 카드와 과교차)·타원 진폭 95(카드 상하 클리어런스).
// 두 캔버스는 반지름과 시작/끝 여백 비율을 공유해 MOMENT_POS 가 동일하게 맞는다. 카드 간격(17.75%)은 등장 구간보다 넓다.
// 레퍼런스 비율(#213 8차): 맨 위 고리부터 화면 폭 ~60%(rTop 300), 테이퍼는
// 은은하게(→430). 한 화면에 ~2바퀴(10바퀴/캔버스), 타원 납작비 0.30.
// 끝을 캔버스 바닥(99.2%)까지 — 선이 브랜드 로고 직전까지 이어진다(#213 9차).
// 페이지가 길다는 피드백(#223) — 캔버스 ~15% 단축(바퀴 수 유지, 피치만 촘촘).
const DESKTOP = { vb: "0 0 1000 4100", geom: helixSegments(500, 300, 430, 0.3, 154, 4059, 10, 640) };
const MOBILE = { vb: "0 0 1000 8500", geom: helixSegments(500, 300, 430, 0.3, 319, 8415, 10, 640) };

// #213 7차: 곡선(원뿔 나선)에 집중하는 동안 멘트·점 임시 오프용 플래그.
const SHOW_MOMENTS = true;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// 캔버스 2개(데스크톱·모바일)의 세그먼트 지오메트리 — 효과 루프가 참조.
const CANVASES = [DESKTOP, MOBILE];

export function HelixJourney() {
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
                  strokeWidth={1.3}
                  opacity={1}
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

      {/* 철학 멘트 — 곡선 위 점 + 극점 바깥 여백 포켓 (#225, 카드 시절 배치 유지).
          점이 왼쪽 극점이면 왼쪽 여백에(오른쪽 끝을 점에 붙임), 오른쪽 극점이면
          오른쪽 여백에 — 코일과 겹치지 않는 곳에서 커졌다 작아진다. 모바일은
          공간이 없어 점 안쪽(고리 입구)에. */}
      {SHOW_MOMENTS && PILLARS.map((v, i) => {
        const pos = MOMENT_POS[i];
        const dotLeft = pos.x < 50; // 왼쪽 극점 → 멘트는 왼쪽 포켓
        return (
          <div key={v.han}>
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
              className={`absolute w-[46%] max-w-72 md:w-[26%] ${
                dotLeft
                  ? "max-md:left-[calc(var(--dx)*1%+12px)] max-md:text-left md:right-[calc((100-var(--dx))*1%+14px)] md:text-right"
                  : "max-md:right-[calc((100-var(--dx))*1%+12px)] max-md:text-right md:left-[calc(var(--dx)*1%+14px)] md:text-left"
              }`}
              style={{
                top: `${pos.y}%`,
                opacity: 0,
                transform: "translateY(-50%) scale(0.78)",
                ["--dx" as string]: pos.x,
              }}
              // 초기(숨김) 상태 — JS 로드 전에도 키보드·스크린리더에서 제외
              inert
            >
              <div className="[font-family:var(--ws-serif)] text-[40px] leading-none text-[#423c30] md:text-[52px]">
                {v.han}
              </div>
              <div className="mt-3 [font-family:var(--ws-mono)] text-[9px] tracking-[2px] text-[#9a9080] md:text-[10px]">
                {v.label}
              </div>
              <p className="mt-2 [font-family:var(--ws-serif)] text-[14px] leading-[1.6] text-[#524a3a] md:text-[17px]">
                {v.body}
              </p>
            </div>
          </div>
        );
      })}

    </div>
  );
}

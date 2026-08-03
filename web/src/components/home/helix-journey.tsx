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
//   레이아웃 시프트가 없다. 모바일은 세로 피치를 늘려 멘트 간격을 확보하고, 코일
//   반지름을 좁혀 좌우에 멘트 포켓을 낸다(데스크톱과 같은 "바깥 여백" 배치).

// 侘·寂·選 — 브랜드 철학 3주. 곡선 여정 안에서 등장한다(#225, 대표님 피드백 —
// "카드 대신 저 멘트들"). 한자만 브랜드 상징이라 코드 고정, 제목(라벨)·본문은
// 대표님이 어드민에서 편집한다(#245·#247) — page 에서 props 로 주입한다.
const PILLAR_HANJA = ["侘", "寂", "選"] as const;

// 입체 스프링 나선 (#213, 대표님 피드백 — 평면 S커브가 아닌 3D 코일).
// 나선을 앞면/뒷면 반바퀴 세그먼트로 쪼개 누적 순서로 이어 그린다. 선 자체는
// 색·굵기 완전 균일(#213 5차 — 옅기 차이가 얼룩처럼 보임) — 입체감은 교차
// 기하만으로 낸다(레퍼런스와 동일). 세그먼트 길이는 폴리라인
// 현(chord) 합 — 브라우저의 path 길이와 정확히 일치하므로 DOM 측정이 필요 없다.
// 결정적 계산이라 SSR/클라 동일(하이드레이션 안전).
type HelixSeg = { d: string; front: boolean; len: number; cum: number };
type HelixGeom = { segs: HelixSeg[]; total: number };
type MomentPos = { x: number; y: number };

function helixSegments(
  cx: number,
  rTop: number,
  rBot: number,
  rYRatio: number, // 타원 세로/가로 비 — 원근(약 0.30~0.36)
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

// 멘트 3주가 앉는 곡선 극점(좌·우·좌) 좌표를 지오메트리에서 직접 계산한다.
// 6바퀴=12반바퀴 중 k=1(좌)·loops(우)·2·loops−1(좌) 극점. 극점(cos(kπ)=±1)에선
// sin(kπ)=0 이라 y 는 피치만으로 정해진다(타원 진폭 무관). 캔버스마다 반지름이
// 달라도 이 함수로 뽑으면 점·멘트가 정확히 곡선 위에 얹힌다(뷰박스 폭 1000 가정).
function momentPositions(
  rTop: number,
  rBot: number,
  yStart: number,
  yEnd: number,
  vbH: number,
  loops: number,
): MomentPos[] {
  const half = loops * 2;
  const ks = [1, loops, loops * 2 - 1];
  return ks.map((k) => {
    const R = rTop + (rBot - rTop) * (k / half);
    const dir = k % 2 === 0 ? 1 : -1; // 짝수 반바퀴=우측 극점, 홀수=좌측
    return {
      x: +(50 + (dir * R) / 10).toFixed(1),
      y: +(((yStart + (yEnd - yStart) * (k / half)) / vbH) * 100).toFixed(1),
    };
  });
}

// 데스크톱: 반지름 300→430, 타원 0.30. 6바퀴/캔버스 — 리드인 반바퀴(곡선이 侘
// 직전에 시작) + 멘트 간격 5반바퀴. axis = 가운데 수직 점선(시간 축, #197 원안)의
// [y1, y2]. 곡선 시작/끝보다 30u 씩 길게 뻗어 여정 전체를 관통한다.
//
// 모바일: 데스크톱처럼 폭을 크게 채우는 원(대표님 — "웹처럼 크게 원 그리며 하강").
// 예전엔 좌우 여백 포켓에 멘트를 넣으려 코일을 좁혔는데(175→230), 원이 작아 납작
// 했다. 이제 반지름을 데스크톱급(285→405, 폭의 ~57~81%)으로 키워 큰 원으로 내려가고,
// 멘트는 좌우 포켓 대신 화면 중앙에 얹는다(아래 렌더 ci===1 분기). 타원비 0.52 로
// 진폭 ≈ 반바퀴 y이동의 ~0.6(데스크톱과 유사)이라 고리가 겹쳐 3D 로 보인다.
// loops 5 — 큰 원이라 5바퀴면 스크롤이 과하지 않고 멘트가 13/50/86% 로 잘 벌어진다.
// 극점 좌표(moments)는 각 반지름에서 계산해 점이 곡선에 정확히 맞는다(멘트는 중앙).
const DESKTOP = {
  vb: "0 0 1000 2530",
  geom: helixSegments(500, 300, 430, 0.3, 95, 2435, 6, 384),
  moments: momentPositions(300, 430, 95, 2435, 2530, 6),
  axis: [65, 2465] as const,
};
const MOBILE = {
  vb: "0 0 1000 3600",
  geom: helixSegments(500, 300, 430, 0.6, 175, 3300, 4, 320),
  moments: momentPositions(300, 430, 175, 3300, 3600, 4),
  axis: [145, 3430] as const,
};

// 모바일 멘트 세로 미세보정(%): 마지막 극점 選(i=2)은 아래 종단 루프가 본문 자리로
// 들어와, 멘트 블록만 위 열린 공간으로 올린다(점은 곡선에 그대로 — 멘트가 여백에
// 떠 보이는 의도된 배치). 侘·寂 은 이미 좌측 여백이 깨끗해 보정 없음.
const MOBILE_MOMENT_NUDGE = [6, 0, -9];

// #213 7차: 곡선(원뿔 나선)에 집중하는 동안 멘트·점 임시 오프용 플래그.
const SHOW_MOMENTS = true;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// 캔버스 2개(데스크톱·모바일)의 지오메트리 — 효과 루프가 참조.
const CANVASES = [DESKTOP, MOBILE];

export function HelixJourney({
  pillarLabels,
  pillarBodies,
}: {
  pillarLabels: string[];
  pillarBodies: string[];
}) {
  // 한자(고정)와 편집 제목·본문(props)을 합쳐 렌더용 3주를 만든다.
  const pillars = PILLAR_HANJA.map((han, i) => ({
    han,
    label: pillarLabels[i] ?? "",
    body: pillarBodies[i] ?? "",
  }));
  const wrapRef = useRef<HTMLDivElement>(null);
  // [캔버스][인덱스] — cfg.geom.segs / cfg.moments 와 같은 인덱스.
  const segRefs = useRef<(SVGPathElement | null)[][]>([[], []]);
  const momentRefs = useRef<(HTMLDivElement | null)[][]>([[], []]);
  const dotRefs = useRef<(HTMLDivElement | null)[][]>([[], []]);

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
      momentRefs.current.flat().forEach((m) => {
        if (m) {
          m.style.opacity = "1";
          m.style.transform = "translateY(-50%)";
          m.style.pointerEvents = "auto";
          m.removeAttribute("inert");
        }
      });
      dotRefs.current.flat().forEach((d) => {
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

        // 멘트 — 뷰포트 중앙 기준 종형. 점이 화면 아래면 0, 중앙에서 최대, 지나가면
        // 다시 소멸. 구간(±0.32vh)이 멘트 간 스크롤 간격보다 좁아 앞 멘트가 완전히
        // 사라진 뒤에야 다음 멘트가 나타난다. 캔버스마다 자기 극점 y 를 쓴다.
        cfg.moments.forEach((pos, i) => {
          const m = momentRefs.current[ci][i];
          if (!m) return;
          const dotY = top + (pos.y / 100) * height;
          const dist = Math.abs(dotY - vh * 0.5) / (vh * 0.32);
          const vis = clamp01(1 - dist);
          m.style.opacity = vis.toFixed(3);
          m.style.transform = `translateY(-50%) scale(${(0.78 + 0.22 * vis).toFixed(3)})`;
          // 사라진 멘트가 보이지 않는 클릭·포커스 함정이 되지 않게 — pointer-events
          // 는 포인터만 막으므로 inert 로 키보드 탭·접근성 트리에서도 제외(CodeRabbit #198).
          m.style.pointerEvents = vis < 0.1 ? "none" : "auto";
          m.toggleAttribute("inert", vis < 0.1);
          const dot = dotRefs.current[ci][i];
          if (dot) dot.style.opacity = vis.toFixed(3);
        });
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
      {/* 데스크톱/모바일 캔버스 — CSS 로만 전환(레이아웃 시프트 없음). 각 캔버스의
          곡선 SVG 와 그 위 멘트를 한 컨테이너에 묶어, 멘트가 해당 캔버스 극점에
          정확히 얹히게 한다(데스크톱·모바일 반지름이 달라도 각자 맞음). */}
      {[
        { cfg: DESKTOP, cls: "hidden md:block", key: "d" },
        { cfg: MOBILE, cls: "md:hidden", key: "m" },
      ].map(({ cfg, cls, key }, ci) => (
        <div key={key} className={`relative ${cls}`}>
          <svg
            viewBox={cfg.vb}
            className="h-auto w-full overflow-visible"
            aria-hidden
          >
            {/* 시간 축 — 가운데 수직 점선(#197 원안, 대표님 피드백으로 복원).
                정적 요소라 스크럽 없이 늘 보이고, 코일이 위에 겹쳐 그려진다. */}
            <line
              x1="500"
              y1={cfg.axis[0]}
              x2="500"
              y2={cfg.axis[1]}
              stroke="#423c30"
              strokeWidth="1"
              strokeDasharray="1 6"
              opacity="0.55"
            />
            {/* 축 상단 화살촉(위 방향) — 원안 그대로 */}
            <path
              d={`M500 ${cfg.axis[0]} L493 ${cfg.axis[0] + 22} M500 ${cfg.axis[0]} L507 ${cfg.axis[0] + 22}`}
              fill="none"
              stroke="#423c30"
              strokeWidth="1.1"
            />
            {/* 입체 스프링(#213) — 뒷면을 먼저, 앞면이 교차점에서 덮는다. 각 세그먼트는
                자기 길이만큼의 dash 로 숨겨져 있다가 누적 순서대로 그려진다. */}
            {[false, true].map((frontPass) =>
              cfg.geom.segs.map((seg, si) =>
                seg.front === frontPass ? (
                  <path
                    key={si}
                    ref={(el) => {
                      segRefs.current[ci][si] = el;
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

          {/* 철학 멘트 — 곡선 위 점 + 극점 바깥 여백 포켓 (#225). 점이 왼쪽 극점이면
              왼쪽 여백에(오른쪽 끝을 점에 붙임), 오른쪽 극점이면 오른쪽 여백에 —
              코일과 겹치지 않는 곳에서 커졌다 작아진다. 데스크톱·모바일 동일 배치
              (모바일도 코일을 좁혀 바깥 포켓을 확보 → 선을 뚫지 않는다). */}
          {SHOW_MOMENTS &&
            pillars.map((v, i) => {
              const pos = cfg.moments[i];
              const dotLeft = pos.x < 50; // 왼쪽 극점 → 멘트는 왼쪽 포켓
              // 멘트 블록 세로 위치 — 모바일은 극점별 미세보정(점은 pos.y 그대로).
              const commentTop =
                ci === 1 ? pos.y + (MOBILE_MOMENT_NUDGE[i] ?? 0) : pos.y;
              return (
                <div key={v.han}>
                  <div
                    ref={(el) => {
                      dotRefs.current[ci][i] = el;
                    }}
                    className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#423c30]"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: 0 }}
                  />
                  <div
                    ref={(el) => {
                      momentRefs.current[ci][i] = el;
                    }}
                    // 데스크톱(ci=0): 극점 바깥 여백 포켓. 모바일(ci=1): 원이 폭을
                    // 크게 채워 포켓이 없으므로 화면 중앙에 얹는다(양쪽 인셋=중앙정렬).
                    // 큰 원이라 곡선이 글자 위를 지나므로, 카드가 아닌 부드러운 크림
                    // 후광(radial-gradient, 가장자리는 투명)으로 텍스트 가독성을 낸다.
                    className={
                      ci === 1
                        ? // 모바일: 큰 코일의 스파인이 각 극점 프레임에서 우측에 놓이므로
                          // 멘트는 좌측 열린 공간에만 앉힌다(후광 없이 온전히 여백에).
                          "absolute left-[7%] right-[42%] text-left"
                        : `absolute w-[28%] max-w-72 md:w-[26%] ${
                            dotLeft
                              ? "right-[calc((100-var(--dx))*1%+14px)] text-right"
                              : "left-[calc(var(--dx)*1%+14px)] text-left"
                          }`
                    }
                    style={{
                      top: `${commentTop}%`,
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
      ))}
    </div>
  );
}

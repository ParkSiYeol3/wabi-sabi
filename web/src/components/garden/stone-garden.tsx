"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlacedStone } from "@/lib/garden-layout";
import { GardenSound } from "@/components/garden/garden-sound";
import { cn } from "@/lib/utils";

// 돌의 정원 — 가레산스이(枯山水) 감상 화면 (#616, 대표님).
//
// 가레산스이는 들어가는 정원이 아니다. 縁側(엔가와)에 앉아 보기만 한다. 그래서
// 이 화면도 "걸어 들어가는" 동작이 없다 — 세로 스크롤로 파고들지 않고, 좌우로만
// 시선이 움직인다. 앉은 자리는 그대로다.
//
// 그 결과가 곧 운영 정책이기도 하다(대표님 — 팔지만 파는 듯하지 않게): 가격이
// 없고, 담기 버튼이 없고, 재촉하는 문구가 없다. 한 번 누르면 이름만 조용히
// 떠오르고, 정말 궁금한 손님만 한 번 더 눌러 상세로 나간다.

export function StoneGarden({
  stones,
  width,
}: {
  stones: PlacedStone[];
  // 정원의 가로 길이(화면 폭 배수) — 한 화면에 다 담기지 않아야 둘러보게 된다.
  width: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);

  // 휠은 세로로 들어온다 — 정원은 옆으로 흐르므로 가로 스크롤로 옮긴다.
  // React 가 root 에 붙이는 wheel 리스너는 passive 라 preventDefault 가 먹지
  // 않는다 → 여기서 passive:false 로 직접 건다.
  //
  // 다만 마당이 화면에 온전히 들어오기 전에는 가로채지 않는다(#630, 시열님).
  // 페이지에 막 들어오면 마당은 아래쪽이 잘려 있는데, 그때부터 세로 휠을 뺏으면
  // 마당을 화면에 맞출 방법이 없어 답답해진다.
  //
  // 판정은 **손짓(gesture)마다 한 번만** 한다(#642, 시열님 — 화면이 흔들림).
  // 트랙패드·관성 스크롤은 이벤트가 수십 개 이어져 오는데, 매 이벤트마다 다시
  // 판정하면 마당이 끝에 닿는 순간 남은 관성이 통째로 페이지에 쏟아진다. 가로로
  // 밀던 중에 화면이 세로로 튀는 게 그 때문이다. 한 손짓의 임자를 처음에 정하고
  // 끝까지 지키면, 마당은 마당대로 흐르고 페이지는 다음 손짓에 움직인다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // 마지막 휠로부터 이 시간이 지나면 새 손짓으로 본다(관성 꼬리보다 길게).
    const GESTURE_GAP = 180;
    let owner: "garden" | "page" | null = null;
    let lastAt = 0;

    // 휠 델타의 단위는 브라우저마다 다르다(픽셀/줄/페이지). 줄·페이지로 오면
    // 숫자가 한 자릿수라 그대로 쓰면 마당이 거의 안 움직인다.
    const px = (d: number, mode: number) =>
      mode === 1 ? d * 16 : mode === 2 ? d * el.clientWidth : d;

    const onWheel = (e: WheelEvent) => {
      if (e.timeStamp - lastAt > GESTURE_GAP) owner = null;
      lastAt = e.timeStamp;

      if (owner === null) {
        const box = el.getBoundingClientRect();
        const framed = box.top >= -2 && box.bottom <= window.innerHeight + 2;
        const max = el.scrollWidth - el.clientWidth;
        // 마당이 온전히 보이고, 세로 의도이고, 그 방향으로 아직 밀 데가 남았을 때만.
        const mine =
          framed &&
          Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
          ((e.deltaY > 0 && el.scrollLeft < max - 1) ||
            (e.deltaY < 0 && el.scrollLeft > 1));
        owner = mine ? "garden" : "page";
      }

      // 페이지 차례면 손대지 않는다 — 가로 제스처·마당 밖에서는 원래대로 동작.
      if (owner !== "garden") return;

      // 마당 차례면 끝에 닿아도 계속 막는다. 여기서 놓아 주면 남은 관성이
      // 페이지로 쏟아져 화면이 튄다. 손을 뗐다 다시 밀면 페이지가 움직인다.
      e.preventDefault();
      el.scrollLeft += px(e.deltaY + e.deltaX, e.deltaMode);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 借景(차경) 시차 — 담 너머 나무는 멀리 있으니 눈을 돌려도 덜 움직인다. 모래보다
  // 훨씬 느리게 밀어 거리감을 만든다. transform 만 만져 리렌더가 없다.
  //
  // 밀 수 있는 거리는 레이어가 화면 밖으로 나가 있는 만큼이 전부다(#634). 그보다
  // 더 밀면 오른쪽 끝이 화면 안으로 들어와 담과 나무가 뚝 끊긴다 — 마당 끝까지
  // 밀어 본 손님에게만 보이던 버그였다. 남은 여백을 재서 거기까지만 민다.
  useEffect(() => {
    const el = scrollRef.current;
    const back = backdropRef.current;
    if (!el || !back) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // 레이어는 부모보다 넓고 좌우로 반씩 물려 있다 → 한쪽 여백 = (폭 차이)/2.
        const slack = (back.offsetWidth - (back.parentElement?.clientWidth ?? 0)) / 2;
        // 2px 은 반올림 여유 — 딱 맞춰 두면 소수점 오차로 실낱 같은 틈이 보인다.
        const shift = Math.min(el.scrollLeft * 0.22, Math.max(slack - 2, 0));
        back.style.transform = `translateX(${-shift}px)`;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // 砂紋 — 손이 지나간 자리에 이는 물결. 상태를 두지 않고 스타일만 직접 만져
  // 리렌더 없이 따라온다. 터치 기기·모션 최소화 설정에서는 붙이지 않는다.
  useEffect(() => {
    const host = scrollRef.current;
    const ripple = rippleRef.current;
    if (!host || !ripple) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = host.getBoundingClientRect();
        ripple.style.opacity = "1";
        ripple.style.transform = `translate(${e.clientX - box.left - 110}px, ${e.clientY - box.top - 110}px)`;
      });
    };
    const onLeave = () => {
      ripple.style.opacity = "0";
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative">
      {/* 借景 — 담 너머로 빌려 온 풍경. 정원 안에 나무를 심지 않고 밖의 나무를
          들여다본다. 스크롤 컨테이너 밖에 둬 함께 흐르지 않고 아주 느리게만 민다. */}
      {/* 모래 위에 얹는다(z-10) — 담은 그 뒤의 땅을 가리는 게 맞고, 모래 배경이
          불투명해 뒤에 두면 통째로 덮인다. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[34%] overflow-hidden">
        <div
          ref={backdropRef}
          aria-hidden
          className="garden-shakkei absolute top-0 -left-[30%] h-full w-[160%]"
        >
          {/* 苔 — 초록이 모래에 닿는 자리. 실제 마당에서도 이끼가 경계를 맡는다. */}
          <span className="garden-moss-edge absolute inset-x-0 bottom-0 block h-6 sm:h-8" />
        </div>
      </div>

      <div
        ref={scrollRef}
        // 모래밭 — 갈퀴질한 결을 가로로 길게 긋는다(마루와 나란한 방향).
        className="garden-sand relative h-[68vh] min-h-112 overflow-x-auto overflow-y-hidden sm:h-[76vh]"
        // 빈 모래를 누르면 떠올랐던 이름이 가라앉는다.
        onClick={() => setActive(null)}
      >
        <div
          ref={rippleRef}
          aria-hidden
          className="garden-ripple pointer-events-none absolute top-0 left-0 size-55 opacity-0"
        />

        <div className="relative h-full" style={{ width }}>
          {stones.map((s) => {
            const on = active === s.id;
            return (
              <div
                key={s.id}
                className="absolute"
                style={
                  {
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    zIndex: Math.round(s.y),
                    "--s": s.size,
                  } as CSSProperties
                }
              >
                {/* 돌이 모래에 닿는 자리 — 그림자가 있어야 놓인 것으로 보인다. */}
                <span
                  aria-hidden
                  className="garden-stone-shadow pointer-events-none absolute top-1/2 left-1/2"
                  style={{
                    width: "calc(var(--s) * var(--stone-scale) * 1.12vmin)",
                    height: "calc(var(--s) * var(--stone-scale) * 0.34vmin)",
                    transform: "translate(calc(-50% + 4%), calc(-50% + 44%))",
                  }}
                />
                {/* 苔 — 돌 밑동의 이끼. 정원에서 유일한 초록이다. */}
                {s.moss && (
                  <span
                    aria-hidden
                    className="garden-moss pointer-events-none absolute top-1/2 left-1/2"
                    style={{
                      width: `calc(var(--s) * var(--stone-scale) * ${s.moss.scale}vmin)`,
                      height: `calc(var(--s) * var(--stone-scale) * ${s.moss.scale * 0.62}vmin)`,
                      borderRadius: s.moss.radius,
                      transform: `translate(calc(-50% + ${s.moss.dx}%), calc(-50% + ${s.moss.dy}%))`,
                    }}
                  />
                )}
                {/* 돌 둘레의 파문 — 물이 없는 곳에 그린 물결. */}
                <span
                  aria-hidden
                  className="garden-samon pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                />
                <Link
                  href={`/shop/${s.id}`}
                  aria-label={on ? `${s.name} 자세히 보기` : s.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 첫 손짓엔 이름만. 정말 보고 싶은 사람만 한 번 더 누른다.
                    if (!on) {
                      e.preventDefault();
                      setActive(s.id);
                    }
                  }}
                  className={cn(
                    "garden-stone relative block overflow-hidden rounded-full transition-[transform,box-shadow] duration-700 ease-out",
                    on
                      ? "scale-[1.04] shadow-[0_10px_30px_rgba(60,52,44,0.18)]"
                      : "shadow-[0_6px_18px_rgba(60,52,44,0.10)]",
                  )}
                >
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 30vw, 18vw"
                    className="object-cover"
                  />
                </Link>

                {/* 이름은 속삭이듯 — 가격도, 담기도 없다. */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-[calc(100%+0.6rem)] left-1/2 w-40 -translate-x-1/2 text-center text-xs leading-5 text-wabi-fg transition-opacity duration-500",
                    on ? "opacity-100" : "opacity-0",
                  )}
                >
                  {s.name}
                  <span className="mt-0.5 block text-[10px] text-wabi-fg-muted">
                    한 번 더 누르면 자세히
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 縁側 — 앉는 자리. 정원 안으로는 들어가지 않는다. */}
      <div
        aria-hidden
        className="garden-engawa pointer-events-none absolute right-0 bottom-0 left-0 h-14 sm:h-20"
      />

      {/* 정원의 소리 — 마루 끝에 놓인 스위치처럼 오른쪽 아래에. */}
      <div className="pointer-events-none absolute right-3 bottom-3 z-20 sm:right-5 sm:bottom-6">
        <GardenSound />
      </div>
    </div>
  );
}

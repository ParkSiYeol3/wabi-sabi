"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// 정원의 소리 (#621, 대표님 — "새소리·물소리가 들리는 듯한 분위기").
//
// 스스로 켜지지 않는다. 소리는 손님이 원할 때만 나야 하고, 브라우저도 손짓 없는
// 재생을 막는다. 3.4MB 음원이라 파일도 켤 때 처음 받는다(preload 안 함).
//
// 볼륨은 서서히 올린다 — 정원에 소리가 "켜지는" 게 아니라 "들려오는" 느낌으로.
const SRC = "/sounds/garden-forest-stream.mp3";
const VOLUME = 0.32;
const FADE_MS = 1200;

export function GardenSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [on, setOn] = useState(false);

  // 페이지를 떠나면 소리도 함께 멈춘다.
  useEffect(() => {
    return () => {
      if (fadeRef.current) window.clearInterval(fadeRef.current);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const fadeTo = (target: number, done?: () => void) => {
    const el = audioRef.current;
    if (!el) return;
    if (fadeRef.current) window.clearInterval(fadeRef.current);
    const step = 40;
    const delta = ((target - el.volume) * step) / FADE_MS;
    fadeRef.current = window.setInterval(() => {
      const next = el.volume + delta;
      const finished = delta > 0 ? next >= target : next <= target;
      el.volume = finished ? target : Math.min(1, Math.max(0, next));
      if (finished) {
        if (fadeRef.current) window.clearInterval(fadeRef.current);
        fadeRef.current = null;
        done?.();
      }
    }, step);
  };

  const toggle = () => {
    if (on) {
      fadeTo(0, () => audioRef.current?.pause());
      setOn(false);
      return;
    }
    // ref 에 담기 전에 완성해서 넣는다 — 담은 뒤에 그 변수를 다시 만지면
    // react-hooks/immutability 가 ref 자체를 고치는 것으로 본다.
    if (!audioRef.current) {
      const created = new Audio(SRC);
      created.loop = true;
      created.preload = "none";
      created.volume = 0;
      audioRef.current = created;
    } else {
      audioRef.current.volume = 0;
    }
    // 자동재생 정책·네트워크 실패로 거절될 수 있다 — 거절되면 조용히 끈 채로 둔다.
    audioRef.current.play().then(
      () => {
        setOn(true);
        fadeTo(VOLUME);
      },
      () => setOn(false),
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "정원의 소리 끄기" : "정원의 소리 켜기"}
      className="pointer-events-auto flex items-center gap-1.5 border border-wabi-border/70 bg-wabi-bg/70 px-2.5 py-1.5 text-[11px] text-wabi-fg-muted backdrop-blur-[2px] transition-colors hover:border-wabi-fg hover:text-wabi-fg"
    >
      {on ? (
        <Volume2 className="size-3.5" strokeWidth={1.5} aria-hidden />
      ) : (
        <VolumeX className="size-3.5" strokeWidth={1.5} aria-hidden />
      )}
      {on ? "소리 끄기" : "소리 켜기"}
    </button>
  );
}

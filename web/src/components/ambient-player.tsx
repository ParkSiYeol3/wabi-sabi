"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// 잔잔한 배경음(대표님/시열님) — river 자연음이 메인으로 먼저, 이후 나머지 트랙을
// 셔플 루프. 브라우저는 소리 있는 자동재생을 막으므로 "첫 상호작용(클릭·키·스크롤)"에
// 낮은 볼륨으로 은은히 시작하고, 우측 하단 스피커 토글로 끈다. 선호는 localStorage 기억
// (끈 사람은 다음 방문에 자동 시작 안 함). layout 에 마운트돼 페이지 전환에도 끊기지 않음.

const RIVER =
  "/sounds/38534292-river-with-faraway-bird-sounds-low-water-flowing-sounds-161873.mp3";
const OTHERS = [
  "/sounds/leberch-mellow-piano-355602.mp3",
  "/sounds/the_mountain-instrumental-piano-252954.mp3",
  "/sounds/enheee-rain-contemplation-139852.mp3",
];
const VOLUME = 0.06; // 들릴 듯 말 듯 아주 잔잔하게(대표님/시열님) — 배경 공기처럼
const PREF_KEY = "wabi.bgm"; // "on" | "off"

// Fisher–Yates 셔플(원본 불변).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // 재생 대기열 — 처음엔 river 를 맨 앞에, 뒤는 나머지 셔플.
  const queueRef = useRef<string[]>([RIVER, ...shuffle(OTHERS)]);
  const idxRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  // 대기열 끝나면 river 없이 나머지만 다시 셔플해 이어 재생.
  function advance() {
    const audio = audioRef.current;
    if (!audio) return;
    idxRef.current += 1;
    if (idxRef.current >= queueRef.current.length) {
      queueRef.current = shuffle(OTHERS);
      idxRef.current = 0;
    }
    audio.src = queueRef.current[idxRef.current];
    void audio.play().catch(() => {});
  }

  async function start() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    if (!audio.src) audio.src = queueRef.current[idxRef.current];
    try {
      await audio.play();
      setPlaying(true);
      localStorage.setItem(PREF_KEY, "on");
    } catch {
      // 자동재생 거부 — 다음 사용자 제스처에서 다시 시도됨.
    }
  }

  function stop() {
    audioRef.current?.pause();
    setPlaying(false);
    localStorage.setItem(PREF_KEY, "off");
  }

  function toggle() {
    if (playing) stop();
    else void start();
  }

  // 첫 상호작용에 자동 시작(끈 적 없으면). 한 번 시작하면 리스너 해제.
  useEffect(() => {
    if (localStorage.getItem(PREF_KEY) === "off") return;
    const onFirst = () => {
      void start();
      remove();
    };
    const remove = () => {
      ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) =>
        window.removeEventListener(e, onFirst),
      );
    };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) =>
      window.addEventListener(e, onFirst, { once: false, passive: true }),
    );
    return remove;
    // 마운트 1회만 — start 는 ref 기반이라 안정적.
  }, []);

  return (
    <>
      <audio ref={audioRef} onEnded={advance} preload="none" loop={false} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "배경음 끄기" : "배경음 켜기"}
        aria-pressed={playing}
        className="fixed bottom-5 right-5 z-40 flex size-10 items-center justify-center rounded-full border border-wabi-border bg-wabi-bg/80 text-wabi-fg-muted shadow-sm backdrop-blur transition-colors hover:text-wabi-fg"
      >
        {playing ? (
          <Volume2 className="size-4" strokeWidth={1.5} />
        ) : (
          <VolumeX className="size-4" strokeWidth={1.5} />
        )}
      </button>
    </>
  );
}

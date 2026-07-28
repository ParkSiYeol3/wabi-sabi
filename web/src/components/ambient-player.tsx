"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

// 잔잔한 배경음(대표님/시열님) — river 자연음이 메인으로 먼저, 이후 나머지 트랙을
// 셔플 루프. 브라우저는 소리 있는 자동재생을 막으므로 "첫 상호작용(클릭·키·스크롤)"에
// 아주 낮은 볼륨으로 은은히 시작하고, 우측 하단 스피커 토글로 끈다. 선호는 localStorage
// 기억(끈 사람은 다음 방문에 자동 시작 안 함). layout 마운트라 페이지 전환에도 안 끊김.
//
// 첫 방문자는 "클릭하면 소리가 난다"는 걸 알 수 없으므로, 재생 전까지 화면 클릭을
// 유도하는 힌트(글래스 pill + 이퀄라이저)를 띄운다. 첫 조작에 재생과 함께 사라진다.

const RIVER =
  "/sounds/38534292-river-with-faraway-bird-sounds-low-water-flowing-sounds-161873.mp3";
const OTHERS = [
  "/sounds/leberch-mellow-piano-355602.mp3",
  "/sounds/the_mountain-instrumental-piano-252954.mp3",
  "/sounds/enheee-rain-contemplation-139852.mp3",
];
const VOLUME = 0.06; // 들릴 듯 말 듯 아주 잔잔하게 — 배경 공기처럼
const PREF_KEY = "wabi.bgm"; // "on" | "off"
const HINT_DELAY = 900; // 페이지가 자리잡은 뒤 힌트 등장

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
  const [hintOn, setHintOn] = useState(false); // 힌트 마운트 여부
  const [hintShown, setHintShown] = useState(false); // 등장/퇴장 트랜지션

  function closeHint() {
    setHintShown(false);
    window.setTimeout(() => setHintOn(false), 450);
  }

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
      closeHint();
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
      window.addEventListener(e, onFirst, { passive: true }),
    );
    return remove;
    // 마운트 1회만 리스너 등록 — start 는 ref 기반이라 재바인딩 불필요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 재생 전이고 끈 적 없으면 잠시 뒤 힌트 등장(entrance 트랜지션).
  useEffect(() => {
    if (localStorage.getItem(PREF_KEY) === "off") return;
    const t = window.setTimeout(() => setHintOn(true), HINT_DELAY);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hintOn) return;
    const r = requestAnimationFrame(() => setHintShown(true));
    return () => cancelAnimationFrame(r);
  }, [hintOn]);

  return (
    <>
      <audio ref={audioRef} onEnded={advance} preload="none" />

      {/* 클릭 유도 힌트 — 재생 전에만. pointer-events-none 로 아래 클릭을 막지 않는다
          (힌트를 눌러도 창 리스너가 첫 제스처로 잡아 재생된다). */}
      {hintOn && !playing && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-full border border-wabi-fg/15 bg-wabi-bg/85 px-6 py-3.5 ring-1 ring-black/5 backdrop-blur-md",
              // 은은한 글로우(브리딩) — 저모션은 정적 그림자로 폴백.
              "shadow-[0_10px_34px_-10px_rgba(66,60,48,0.3)] motion-safe:animate-[wabi-hint-glow_2.6s_ease-in-out_infinite]",
              "transition-[opacity,transform] duration-500 ease-out",
              hintShown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}
          >
            {/* 이퀄라이저 — 소리가 흐르는 듯한 4막대 */}
            <span
              aria-hidden
              className="flex h-4 items-center gap-0.75 text-wabi-fg"
            >
              <i className="h-4 w-0.75 origin-center rounded-full bg-current motion-safe:animate-[wabi-eq_1s_ease-in-out_infinite]" />
              <i className="h-4 w-0.75 origin-center rounded-full bg-current [animation-delay:0.15s] motion-safe:animate-[wabi-eq_1s_ease-in-out_infinite]" />
              <i className="h-4 w-0.75 origin-center rounded-full bg-current [animation-delay:0.3s] motion-safe:animate-[wabi-eq_1s_ease-in-out_infinite]" />
              <i className="h-4 w-0.75 origin-center rounded-full bg-current [animation-delay:0.45s] motion-safe:animate-[wabi-eq_1s_ease-in-out_infinite]" />
            </span>
            <span className="text-sm font-medium tracking-tight text-wabi-fg">
              화면을 클릭하면 잔잔한 배경음이 흐릅니다
            </span>
          </div>
        </div>
      )}

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

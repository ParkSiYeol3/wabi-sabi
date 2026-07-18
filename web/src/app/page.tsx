import Link from "next/link";
import Image from "next/image";
import { Cormorant_Garamond, Space_Mono, Song_Myung } from "next/font/google";
import { Reveal } from "@/components/reveal";
import {
  HelixJourney,
  MOMENT_LABELS,
} from "@/components/home/helix-journey";
import { SmoothScroll } from "@/components/home/smooth-scroll";
import { getHomeData } from "@/lib/queries/home";

// 홈 전용 무드 폰트 (#197) — 시열님 피드백: 빈티지하고 진지한 궁서체.
// 궁서는 웹폰트가 없어 시스템 궁서(Windows Gungsuh·macOS GungSeo)를 최우선으로
// 쓰고, 없는 기기(모바일 대부분)는 Song Myung(옛 활판 명조 — 가장 가까운 빈티지
// 세리프) 웹폰트로 폴백한다. 라틴 이탤릭은 Cormorant 가 먼저 받는다.
// 전역 토큰은 건드리지 않고 홈 래퍼의 CSS 변수로만 쓴다(리스크 격리).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-ws-mono",
  display: "swap",
});
const songMyung = Song_Myung({
  weight: "400",
  variable: "--font-song-myung",
  display: "swap",
});

// 侘·寂·選 — 브랜드 철학 3주(목업 About 섹션에서, 홈 마무리에 배치)
const pillars = [
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
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ left?: string }>;
}) {
  // 홈 공개 데이터는 캐시된 단일 로더로 (#177). searchParams(탈퇴 안내)는 캐시 밖.
  const [{ journey, philosophy }, { left }] = await Promise.all([
    getHomeData(),
    searchParams,
  ]);

  const moments = journey.map((p, i) => ({
    ...p,
    label: MOMENT_LABELS[i] ?? MOMENT_LABELS[MOMENT_LABELS.length - 1],
  }));

  return (
    <div
      className={`${cormorant.variable} ${spaceMono.variable} ${songMyung.variable} bg-[#f3ebdd] text-[#423c30] [--ws-serif:var(--font-cormorant),Gungsuh,GungSeo,궁서,var(--font-song-myung),serif] [--ws-mono:var(--font-ws-mono),monospace]`}
    >
      {/* 휠 스크롤 이징 — 홈에서만 (#197 6차) */}
      <SmoothScroll />
      {left === "1" && (
        <p role="status" className="bg-[#e7dcc8] px-5 py-3 text-center text-sm">
          회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}

      {/* ── 진입 즉시 곡선만 (#197 대표님 무드 — 코멘트·로고 일절 없음).
           스크린리더용 페이지 제목만 숨김 제공. ── */}
      <h1 className="sr-only">WABI-SABI — 하루의 결을 따라 흐르는 그릇 셀렉트숍</h1>
      <section className="pb-8 pt-6 md:pt-10">
        <HelixJourney moments={moments} />
      </section>

      {/* ── 여정의 끝 — 그제야 브랜드 (#197) ── */}
      <section className="px-6 pb-10 pt-20 text-center md:pt-28">
        <Reveal>
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={280}
            height={139}
            className="mx-auto h-14 w-auto md:h-20"
          />
          <h2 className="mt-6 [font-family:var(--ws-serif)] text-[clamp(30px,4.6vw,52px)] font-medium leading-[1.1]">
            わび-さび{" "}
            <span className="italic text-[#8f8676]">Wabi-sabi</span>
          </h2>
        </Reveal>
        <Reveal>
          <div className="mx-auto mt-8 max-w-155 space-y-4 [font-family:var(--ws-serif)] text-[17px] leading-[1.7] text-[#524a3a] md:text-[19px]">
            {philosophy.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-250 gap-10 border-t border-[rgba(66,60,48,.24)] px-2 pt-11 text-left md:grid-cols-3">
          {pillars.map((v, i) => (
            <Reveal key={v.han} delay={([0, 100, 200] as const)[i] ?? 0}>
              <div>
                <div className="[font-family:var(--ws-serif)] text-[44px] leading-none md:text-[52px]">
                  {v.han}
                </div>
                <div className="mt-3 [font-family:var(--ws-mono)] text-[10px] tracking-[2px] text-[#9a9080]">
                  {v.label}
                </div>
                <p className="mt-2 [font-family:var(--ws-serif)] text-[16px] leading-[1.55] text-[#524a3a] md:text-[18px]">
                  {v.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-16">
            <Link
              href="/shop"
              className="border-b border-[#423c30] pb-1 [font-family:var(--ws-mono)] text-[11px] tracking-[2px] transition-colors hover:text-[#8f8676] md:text-[12px]"
            >
              당신의 하루에 놓일 그릇, 천천히 둘러보세요 →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* 방문 안내는 Contact, 뉴스레터 구독은 추후 별도 위치 — 홈은 여정으로 끝난다(#197 피드백) */}
    </div>
  );
}

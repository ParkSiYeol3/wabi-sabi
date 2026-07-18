import Link from "next/link";
import Image from "next/image";
import {
  Cormorant_Garamond,
  Space_Mono,
  Noto_Serif_KR,
} from "next/font/google";
import { Clock, MapPin, AtSign, Mail } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";
import { MapCard } from "@/components/map-card";
import { Reveal } from "@/components/reveal";
import {
  HelixJourney,
  MOMENT_LABELS,
} from "@/components/home/helix-journey";
import { getHomeData } from "@/lib/queries/home";
import { site } from "@/lib/site";

// 홈 전용 무드 폰트 (#197, 클로드 디자인 목업 v2) — 라틴 세리프 이탤릭 + 모노 +
// 한글 명조. 전역 토큰은 건드리지 않고 홈 래퍼의 CSS 변수로만 쓴다(리스크 격리).
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
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-serif-kr",
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
      className={`${cormorant.variable} ${spaceMono.variable} ${notoSerifKr.variable} bg-[#f3ebdd] text-[#423c30] [--ws-serif:var(--font-cormorant),var(--font-serif-kr),serif] [--ws-mono:var(--font-ws-mono),monospace]`}
    >
      {left === "1" && (
        <p role="status" className="bg-[#e7dcc8] px-5 py-3 text-center text-sm">
          회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}

      {/* ── 진입 — 로고 없이, 선의 시작만 (#197 대표님 무드) ── */}
      <section className="px-6 pb-6 pt-16 text-center md:pt-24">
        <p className="[font-family:var(--ws-mono)] text-[10px] tracking-[3px] text-[#9a9080] md:text-[11px]">
          라이프스타일 셀렉트숍 — SINCE 2026
        </p>
        <h1 className="mt-7 [font-family:var(--ws-serif)] text-[clamp(38px,7vw,92px)] font-medium leading-[1.06] tracking-[-0.5px]">
          말하지 않아도,
          <br />
          <em className="font-normal">자연스레 스며드는</em>
        </h1>
        <p className="mx-auto mt-5 max-w-[540px] [font-family:var(--ws-serif)] italic text-[clamp(16px,2.3vw,25px)] text-[#6b6353]">
          a quiet flow of everyday tableware — follow the line of an ordinary
          day.
        </p>
      </section>

      {/* ── 하루의 결 — 스크롤이 그리는 헬릭스 여정 ── */}
      <section className="pb-8 pt-2">
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
          <div className="mx-auto mt-8 max-w-[620px] space-y-4 [font-family:var(--ws-serif)] text-[17px] leading-[1.7] text-[#524a3a] md:text-[19px]">
            {philosophy.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-[1000px] gap-10 border-t border-[rgba(66,60,48,.24)] px-2 pt-11 text-left md:grid-cols-3">
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
              마음에 드는 그릇 만나기 · ENTER THE SHOP →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Visit / Newsletter — 기능 유지, 무드 톤만 맞춤 ── */}
      <section className="border-t border-[rgba(66,60,48,.16)]">
        <div className="mx-auto max-w-[1000px] px-6 py-20">
          <Reveal>
            <h2 className="text-center [font-family:var(--ws-serif)] text-[26px] font-medium">
              방문 안내 <span className="italic text-[#8f8676]">Visit Us</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-start">
            <Reveal variant="left">
              <ul className="space-y-8">
                <VisitItem icon={<Clock className="size-5" strokeWidth={1.5} />} title="영업 시간">
                  <p>{site.hours}</p>
                  <p className="text-[#8f8676]">{site.closed}</p>
                </VisitItem>
                <VisitItem icon={<MapPin className="size-5" strokeWidth={1.5} />} title="위치">
                  <p>{site.place}</p>
                  <p className="text-[#8f8676]">{site.address}</p>
                  <p className="text-[#8f8676]">{site.addressNote}</p>
                </VisitItem>
                <VisitItem icon={<AtSign className="size-5" strokeWidth={1.5} />} title="인스타그램">
                  <a href={site.instagramUrl} className="hover:underline">
                    {site.instagram}
                  </a>
                </VisitItem>
                <VisitItem icon={<Mail className="size-5" strokeWidth={1.5} />} title="문의">
                  <a href={`mailto:${site.email}`} className="hover:underline">
                    {site.email}
                  </a>
                </VisitItem>
              </ul>
            </Reveal>
            <Reveal variant="right">
              <MapCard />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(66,60,48,.16)] px-6 py-20 text-center">
        <Reveal variant="scale">
          <h2 className="[font-family:var(--ws-serif)] text-[22px] font-medium">
            Newsletter
          </h2>
          <p className="mt-3 text-sm text-[#8f8676]">
            신상품과 특별한 소식을 가장 먼저 받아보세요
          </p>
          <NewsletterForm />
        </Reveal>
      </section>
    </div>
  );
}

function VisitItem({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5" aria-hidden>
        {icon}
      </span>
      <div className="text-sm">
        <h3 className="font-medium">{title}</h3>
        <div className="mt-1 space-y-0.5">{children}</div>
      </div>
    </li>
  );
}

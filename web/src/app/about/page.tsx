import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { InstagramFeed } from "@/components/instagram-feed";
import { site } from "@/lib/site";
import {
  getSiteContent,
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  toParagraphs,
} from "@/lib/queries/content";

export const metadata: Metadata = {
  title: "About",
  description: "와비-사비, 불완전함과 무상함의 아름다움을 받아들이는 미학",
};

// 고르는 기준 (#227) — 브랜드 철학(侘·寂·選)은 홈 곡선 여정이 맡는다(#225).
// About 은 그 철학이 실제 셀렉션에서 어떻게 작동하는지를 설명한다.
// 카피는 대표님 검토 전제 초안.
const criteria = [
  {
    en: "Trace of Hands",
    ko: "손의 흔적",
    body: "물레 자국, 유약의 흐름, 어긋난 좌우 — 같은 형태가 둘 없는 물건만 들입니다.",
  },
  {
    en: "Everyday Use",
    ko: "쓰임",
    body: "장식장이 아니라 식탁 위에서 매일 손에 닿는, 쓰임이 분명한 물건을 고릅니다.",
  },
  {
    en: "Time",
    ko: "시간",
    body: "쓸수록 길이 들고, 낡음이 결이 되는 — 오래 곁에 둘수록 좋아지는 것만 남깁니다.",
  },
] as const;

const stagger = [0, 100, 200] as const;

export default async function AboutPage() {
  const philosophy = toParagraphs(
    (await getSiteContent(PHILOSOPHY_KEY)) ?? DEFAULT_PHILOSOPHY,
  );
  return (
    <>
      {/* 히어로 — 큰 헤드라인 */}
      <section className="border-b border-wabi-border">
        <Container className="py-28 text-center md:py-40">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.3em] text-wabi-fg-muted">
              Wabi-Sabi
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
              불완전함의 미학
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-8 text-wabi-fg-muted md:text-base">
              시간의 흔적이 담긴 수공예 도자기와 생활 오브제.
              <br className="hidden sm:block" />
              장인의 손끝에서 태어난 유일무이한 작품을 큐레이션합니다.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 철학 */}
      <Container className="py-24 md:py-32">
        <div className="grid gap-16 md:grid-cols-2 md:items-center">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
わび-さび <span className="text-wabi-fg-muted">(Wabi-sabi)</span>
            </h2>
            <div className="mt-8 space-y-5 text-sm leading-8 text-wabi-fg-muted md:text-[15px]">
              {philosophy.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* 영업시간 */}
            <dl className="mt-10 border-t border-wabi-border pt-6 text-sm">
              <div className="flex gap-6">
                <dt className="w-16 shrink-0 font-medium">Open</dt>
                <dd className="text-wabi-fg-muted">{site.hours}</dd>
              </div>
              <div className="mt-2 flex gap-6">
                <dt className="w-16 shrink-0 font-medium">Closed</dt>
                <dd className="text-wabi-fg-muted">{site.closed}</dd>
              </div>
            </dl>
          </Reveal>

          {/* 브랜드 이미지 자리 — 실매장/작품 사진 등록 전까지 로고 마크로 채운다 */}
          <Reveal delay={100}>
            <div className="flex aspect-square items-center justify-center overflow-hidden bg-wabi-subtle">
              <Image
                src="/brand/logo-mark.png"
                alt=""
                width={280}
                height={139}
                className="h-auto w-1/2 opacity-15"
              />
            </div>
          </Reveal>
        </div>
      </Container>

      {/* 고르는 기준 — 철학(홈)이 셀렉션에서 어떻게 작동하는지 (#227) */}
      <section className="bg-wabi-subtle">
        <Container className="py-24 md:py-32">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              고르는 기준
            </h2>
            <p className="mt-4 text-center text-sm text-wabi-fg-muted">
              모든 물건은 세 가지 질문을 통과한 뒤에야 매대에 오릅니다.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {criteria.map((v, i) => (
              <Reveal key={v.en} delay={stagger[i]}>
                <div className="text-center md:border-l md:border-wabi-border md:first:border-l-0 md:px-8">
                  <span className="text-2xl font-light text-wabi-fg-muted/60">
                    0{i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-medium tracking-wide">
                    {v.ko}
                    <span className="ml-2 text-xs font-normal uppercase tracking-[0.15em] text-wabi-fg-muted">
                      {v.en}
                    </span>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-wabi-fg-muted">
                    {v.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <Reveal>
        <InstagramFeed />
      </Reveal>
    </>
  );
}

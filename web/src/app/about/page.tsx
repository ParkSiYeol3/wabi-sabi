import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { InstagramFeed } from "@/components/instagram-feed";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "와비-사비, 불완전함과 무상함의 아름다움을 받아들이는 미학",
};

const values = [
  { en: "Imperfection", ko: "불완전함 속에서 발견하는 독특한 아름다움" },
  { en: "Simplicity", ko: "단순함이 만들어내는 깊이있는 여백" },
  { en: "Authenticity", ko: "장인의 손길이 담긴 진정성있는 작품" },
] as const;

const stagger = [0, 100, 200] as const;

export default function AboutPage() {
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
              철학 <span className="text-wabi-fg-muted">Philosophy</span>
            </h2>
            <div className="mt-8 space-y-5 text-sm leading-8 text-wabi-fg-muted md:text-[15px]">
              <p>
                わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는
                일본의 미학입니다.
              </p>
              <p>
                우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를
                큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한
                작품입니다.
              </p>
              <p>
                10년 넘게 오가바의 도자기로 만든 라면을 먹어온 우리가, 생각한
                도자기를 만들어주었으면 하고 오가바 작가님께 주문을 했습니다.
                주문하신 분들만이 가지실 수 있는 특별한 작품들입니다.
              </p>
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

      {/* Our Values */}
      <section className="bg-wabi-subtle">
        <Container className="py-24 md:py-32">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Our Values
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.en} delay={stagger[i]}>
                <div className="text-center md:border-l md:border-wabi-border md:first:border-l-0 md:px-8">
                  <span className="text-2xl font-light text-wabi-fg-muted/60">
                    0{i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-medium tracking-wide">
                    {v.en}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-wabi-fg-muted">
                    {v.ko}
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

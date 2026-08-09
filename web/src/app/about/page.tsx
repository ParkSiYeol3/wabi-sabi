import type { Metadata } from "next";
import Image from "next/image";
import { Clock, MapPin, AtSign, Mail } from "lucide-react";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { InstagramFeed } from "@/components/instagram-feed";
import { MapCard } from "@/components/map-card";
import { site } from "@/lib/site";
import {
  getSiteContent,
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  ABOUT_IMAGE_KEY,
  toParagraphs,
  CRITERIA_LABEL_KEYS,
  CRITERIA_BODY_KEYS,
  CRITERIA_SUBTITLE_KEY,
  DEFAULT_CRITERIA_LABELS,
  DEFAULT_CRITERIA_BODIES,
  DEFAULT_CRITERIA_SUBTITLE,
} from "@/lib/queries/content";

export const metadata: Metadata = {
  title: "와비사비는 이렇습니다.",
  // 완결된 문장으로 채워 검색 스니펫을 확정한다. 짧고 일반적인 설명은 네이버가
  // 무시하고 페이지 본문(h1 わび-さび + 철학 문단)을 긁어 "わび-さび ; …" 처럼
  // 제목조각을 세미콜론으로 붙여 노출한다 → 온전한 브랜드 멘트를 설명으로 준다.
  description:
    "와비사비(WABI-SABI)는 순간의 아름다움보다 시간이 만들어내는 가치를 믿습니다. 매일 손이 가는 기물과 공간에 스며드는 오브제, 오래 곁에 두고 싶은 물건을 큐레이션합니다.",
};

// 고르는 기준 (#227) — 브랜드 철학(侘·寂·選)은 홈 곡선 여정이 맡는다(#225).
// About 은 그 철학이 실제 셀렉션에서 어떻게 작동하는지를 설명한다.
// 문구는 관리자 콘텐츠 탭에서 편집(미저장 시 기본값 폴백).
const stagger = [0, 100, 200] as const;

export default async function AboutPage() {
  const [
    philosophyRaw,
    aboutImage,
    critSubtitle,
    l1,
    l2,
    l3,
    b1,
    b2,
    b3,
  ] = await Promise.all([
    getSiteContent(PHILOSOPHY_KEY),
    getSiteContent(ABOUT_IMAGE_KEY),
    getSiteContent(CRITERIA_SUBTITLE_KEY),
    getSiteContent(CRITERIA_LABEL_KEYS[0]),
    getSiteContent(CRITERIA_LABEL_KEYS[1]),
    getSiteContent(CRITERIA_LABEL_KEYS[2]),
    getSiteContent(CRITERIA_BODY_KEYS[0]),
    getSiteContent(CRITERIA_BODY_KEYS[1]),
    getSiteContent(CRITERIA_BODY_KEYS[2]),
  ]);
  const criteriaSubtitle = critSubtitle ?? DEFAULT_CRITERIA_SUBTITLE;
  const criteria = [
    {
      ko: l1 ?? DEFAULT_CRITERIA_LABELS.criteria_1_label,
      body: b1 ?? DEFAULT_CRITERIA_BODIES.criteria_1_body,
    },
    {
      ko: l2 ?? DEFAULT_CRITERIA_LABELS.criteria_2_label,
      body: b2 ?? DEFAULT_CRITERIA_BODIES.criteria_2_body,
    },
    {
      ko: l3 ?? DEFAULT_CRITERIA_LABELS.criteria_3_label,
      body: b3 ?? DEFAULT_CRITERIA_BODIES.criteria_3_body,
    },
  ];
  const philosophy = toParagraphs(philosophyRaw ?? DEFAULT_PHILOSOPHY);
  return (
    <>
      {/* 철학 — 히어로 없이 바로 본문(대표님 피드백, 히어로 제거) */}
      <Container className="py-24 md:py-32">
        <div className="grid gap-16 md:grid-cols-2 md:items-center">
          <Reveal>
            {/* 히어로 제거로 이 헤딩이 페이지 h1 (SEO·접근성) */}
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              わび-さび
            </h1>
            {/* 브랜드 로마자 — 연하게(대표님). Cormorant 라틴. */}
            <p className="mt-2 text-sm font-light tracking-[0.35em] text-wabi-fg-muted/50 [font-family:var(--font-cormorant)]">
              WABI-SABI
            </p>
            <div className="mt-8 space-y-5 text-sm leading-8 text-wabi-fg-muted md:text-[15px]">
              {philosophy.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>

          {/* 매장 사진 — 어드민에서 업로드(대표님). 없으면 로고 마크 폴백 */}
          <Reveal delay={100}>
            {aboutImage ? (
              <div className="relative aspect-square overflow-hidden bg-wabi-subtle">
                <Image
                  src={aboutImage}
                  alt="와비사비 매장"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-wabi-subtle">
                <Image
                  src="/brand/logo-mark.png"
                  alt=""
                  width={280}
                  height={139}
                  className="h-auto w-1/2 opacity-15"
                />
              </div>
            )}
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
              {criteriaSubtitle}
            </p>
          </Reveal>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {criteria.map((v, i) => (
              <Reveal key={v.ko} delay={stagger[i]}>
                <div className="text-center md:border-l md:border-wabi-border md:first:border-l-0 md:px-8">
                  <span className="font-numeric text-2xl font-light text-wabi-fg-muted/60">
                    0{i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-medium tracking-wide">
                    {v.ko}
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

      {/* 방문 안내 (SHOWROOM) — 구 /contact 를 소개로 합침(#, 대표님). 매장 방문
          정보(영업시간·위치·인스타·문의) + 지도. */}
      <section id="visit">
        <Container className="py-24 md:py-32">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              오시는 길
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-start">
            <ul className="space-y-8">
              <VisitItem
                icon={<Clock className="size-5" strokeWidth={1.5} />}
                title="영업 시간"
              >
                <p className="font-numeric">{site.hours}</p>
                <p className="text-wabi-fg-muted">{site.closed}</p>
              </VisitItem>
              <VisitItem
                icon={<MapPin className="size-5" strokeWidth={1.5} />}
                title="위치"
              >
                <p>{site.place}</p>
                <p className="font-numeric text-wabi-fg-muted">
                  {site.address}
                </p>
                <p className="text-wabi-fg-muted">{site.addressNote}</p>
              </VisitItem>
              <VisitItem
                icon={<AtSign className="size-5" strokeWidth={1.5} />}
                title="인스타그램"
              >
                <a href={site.instagramUrl} className="hover:underline">
                  {site.instagram}
                </a>
              </VisitItem>
              <VisitItem
                icon={<Mail className="size-5" strokeWidth={1.5} />}
                title="문의"
              >
                <a href={`mailto:${site.email}`} className="hover:underline">
                  {site.email}
                </a>
              </VisitItem>
            </ul>
            <MapCard />
          </div>
        </Container>
      </section>

      <Reveal>
        <InstagramFeed />
      </Reveal>
    </>
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
      <span className="mt-0.5 text-wabi-fg" aria-hidden>
        {icon}
      </span>
      <div className="text-sm">
        <h3 className="font-medium">{title}</h3>
        <div className="mt-1 space-y-0.5">{children}</div>
      </div>
    </li>
  );
}

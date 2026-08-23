import type { Metadata } from "next";
import Image from "next/image";
import { Clock, MapPin, AtSign, Mail } from "lucide-react";
import { Container } from "@/components/layout/container";
import { FeaturedShortcuts } from "@/components/shop/featured-shortcuts";
import { Reveal } from "@/components/common/reveal";
import { MapCard } from "@/components/map/map-card";
import { site, business } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";
import {
  getSiteContent,
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  ABOUT_IMAGE_KEY,
  toParagraphs,
  CRITERIA_LABEL_KEYS,
  CRITERIA_BODY_KEYS,
  CRITERIA_SUBTITLE_KEY,
  CRITERIA_HEADING_KEY,
  DEFAULT_CRITERIA_LABELS,
  DEFAULT_CRITERIA_BODIES,
  DEFAULT_CRITERIA_SUBTITLE,
  DEFAULT_CRITERIA_HEADING,
} from "@/lib/queries/content";

export const metadata: Metadata = {
  title: "와비사비는 이렇습니다.",
  // 자기 캐노니컬(/about) — 홈(/)과 역할을 분리한다. 브랜드 대표 주소는 홈이므로,
  // about 은 "소개/고르는 기준" 특화 설명으로 바꿔 "와비사비" 브랜드 쿼리에서 홈과
  // 직접 경쟁하지 않게 한다. 완결된 문장이라 네이버가 본문을 긁어 세미콜론으로
  // 붙이던 스니펫 문제도 재발하지 않는다.
  alternates: { canonical: "/about" },
  description:
    "와비사비라는 이름에 담긴 뜻과, 우리가 기물을 고르는 기준을 소개합니다. 시간의 흔적이 담긴 그릇과 오브제를 어떻게 선별하는지, 브랜드의 시작을 전합니다.",
};

// 고르는 기준 (#227) — 브랜드 철학(侘·寂·選)은 홈 곡선 여정이 맡는다(#225).
// About 은 그 철학이 실제 셀렉션에서 어떻게 작동하는지를 설명한다.
// 문구는 관리자 콘텐츠 탭에서 편집(미저장 시 기본값 폴백).
const stagger = [0, 100, 200] as const;

// 매장(오프라인) 구조화 데이터 — 로컬 검색·구글 지도 노출용(천안 대면/택배 거래처).
// 홈의 OnlineStore(레이아웃)와 별개로, 물리 매장을 Store 로 명시한다. 좌표는 미보유라
// 주소로 지오코딩되게 두고, 영업요일은 미확정이라 openingHours 는 대표님 확인 후 추가.
function storeJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: site.name,
    image: `${SITE_URL}/brand/logo-stacked.png`,
    url: SITE_URL,
    telephone: business.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "대흥로 338 1층 2호",
      addressLocality: "천안시 동남구",
      addressRegion: "충청남도",
      postalCode: "31122",
      addressCountry: "KR",
    },
    priceRange: "₩₩",
    // 영업시간 — 매주 수요일 정기휴무, 그 외 12:00–19:00(대표님 확정).
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "12:00",
      closes: "19:00",
    },
  }).replace(/</g, "\\u003c");
}

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
    critHeading,
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
    getSiteContent(CRITERIA_HEADING_KEY),
  ]);
  const criteriaSubtitle = critSubtitle ?? DEFAULT_CRITERIA_SUBTITLE;
  const criteriaHeading = critHeading ?? DEFAULT_CRITERIA_HEADING;
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: storeJsonLd() }}
      />
      {/* 철학 — 히어로 없이 바로 본문(대표님 피드백, 히어로 제거) */}
      <Container className="pb-24 pt-10 sm:pt-24 md:py-32">
        {/* 특색 대분류(대표님) — 여러 페이지 상단에 월간 그릇·오늘의 와비사비 */}
        <FeaturedShortcuts className="mb-10 max-w-md" />
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
              {criteriaHeading}
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
          {/* 지도가 목록 높이가 아니라 '오시는 길' 제목 높이에서 시작하도록 제목을
              좌측 열 안으로 넣는다(대표님 — 지도가 너무 낮아 균형이 안 맞음).
              md:items-start 로 지도 상단이 제목과 정렬돼 위로 올라온다. */}
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            <div>
              <Reveal>
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  오시는 길
                </h2>
              </Reveal>
              <ul className="mt-12 space-y-8">
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
                title="Instagram"
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
            </div>
            <MapCard />
          </div>
        </Container>
      </section>
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

import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Clock, MapPin, AtSign, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { MapCard } from "@/components/map-card";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { getFeaturedProducts, getProducts } from "@/lib/queries/products";
import { site } from "@/lib/site";

const values = [
  { en: "Imperfection", ko: "불완전함 속에서 발견하는 독특한 아름다움" },
  { en: "Simplicity", ko: "단순함이 만들어내는 깊이있는 여백" },
  { en: "Authenticity", ko: "장인의 손길이 담긴 진정성있는 작품" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ left?: string }>;
}) {
  // 실 DB 상품 — 이전엔 하드코딩 더미(존재하지 않는 상품명·가격)를 노출했다.
  // 서로 의존성이 없는 요청은 병렬로 — 순차 await 워터폴 제거(TTFB 단축).
  // featured=카드용, slidePool=히어로 슬라이드쇼용, searchParams=탈퇴 안내 플래그.
  const [featured, slidePool, { left }] = await Promise.all([
    getFeaturedProducts(4),
    getProducts({ limit: 12 }),
    searchParams,
  ]);
  // 히어로 배경 슬라이드쇼용 — 이미지가 등록된 활성 상품에서 모아 중복 URL 제거.
  // (featured 만 쓰면 이 달의 상품이 사진 없을 때 배경이 비므로 상품 전체에서 수집.)
  // 사진이 여러 장이면 크로스페이드로 순환, 1장이면 정적, 0장이면 기본 배경.
  const heroImages = [
    ...new Set(
      slidePool
        .map((p) => p.image)
        .filter((src): src is string => Boolean(src)),
    ),
  ].slice(0, 6);

  return (
    <>
      {left === "1" && (
        <p
          role="status"
          className="bg-wabi-muted px-5 py-3 text-center text-sm"
        >
          회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-wabi-subtle">
        {heroImages.length > 0 && <HeroSlideshow images={heroImages} />}
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-5 py-28 text-center md:py-36">
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={560}
            height={278}
            preload
            className="h-20 w-auto md:h-28 drop-shadow-[0_2px_16px_rgba(247,246,244,0.95)]"
          />
          <h1 className="mt-8">
            <Image
              src="/brand/logo-wordmark.png"
              alt={`${site.name} — わび-さび`}
              width={720}
              height={239}
              preload
              className="h-10 w-auto md:h-12 drop-shadow-[0_2px_14px_rgba(247,246,244,0.95)]"
            />
          </h1>
          <p className="mt-5 text-sm font-medium tracking-wide text-black [text-shadow:0_0_4px_rgb(255_255_255),0_1px_12px_rgb(255_255_255)]">
            {site.tagline}
          </p>
          <p className="mt-1 text-xs font-semibold tracking-wide text-black [text-shadow:0_0_4px_rgb(255_255_255),0_1px_12px_rgb(255_255_255)]">
            {site.categoriesLine}
          </p>
          <Button asChild className="mt-10 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90">
            <Link href="/shop">SEE MORE</Link>
          </Button>
        </div>
      </section>

      {/* ── Featured Collection ────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24">
        <h2 className="text-center text-xl font-semibold tracking-wide">
          Featured Collection
        </h2>
        {featured.length === 0 ? (
          <p className="mt-12 text-center text-sm text-wabi-fg-muted">
            준비 중인 상품입니다.
          </p>
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-12 text-center">
          <Button
            asChild
            variant="outline"
            className="rounded-none border-wabi-fg px-8"
          >
            <Link href="/shop">VIEW ALL</Link>
          </Button>
        </div>
      </section>

      {/* ── Philosophy ─────────────────────────────────────── */}
      <section className="bg-wabi-subtle">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-24 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-semibold">
              철학 <span className="text-wabi-fg-muted">Philosophy</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-wabi-fg-muted">
              <p>
                わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는
                일본의 미학입니다.
              </p>
              <p>
                우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를
                큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한
                작품입니다.
              </p>
            </div>
          </div>
          <div className="flex aspect-[4/3] items-center justify-center bg-wabi-muted">
            <ImageIcon
              className="size-10 text-wabi-fg-muted/40"
              strokeWidth={1}
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* ── Our Values ─────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24">
        <h2 className="text-center text-xl font-semibold">Our Values</h2>
        <div className="mt-12 grid gap-10 text-center md:grid-cols-3">
          {values.map((v) => (
            <div key={v.en}>
              <h3 className="text-base font-medium">{v.en}</h3>
              <p className="mt-3 text-sm text-wabi-fg-muted">{v.ko}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Visit Us ───────────────────────────────────────── */}
      <section className="bg-wabi-subtle">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <h2 className="text-center text-xl font-semibold">
            방문 안내 <span className="text-wabi-fg-muted">Visit Us</span>
          </h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-start">
            {/* a11y: dt/dd 없는 dl 은 마크업 위반(Lighthouse definition-list) → ul 로 */}
            <ul className="space-y-8">
              <VisitItem icon={<Clock className="size-5" strokeWidth={1.5} />} title="영업 시간">
                <p>{site.hours}</p>
                <p className="text-wabi-fg-muted">{site.closed}</p>
              </VisitItem>
              <VisitItem icon={<MapPin className="size-5" strokeWidth={1.5} />} title="위치">
                <p>{site.place}</p>
                <p className="text-wabi-fg-muted">{site.address}</p>
                <p className="text-wabi-fg-muted">{site.addressNote}</p>
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
            <MapCard />
          </div>
        </div>
      </section>

      {/* ── Newsletter ─────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 text-center">
        <h2 className="text-xl font-semibold">Newsletter</h2>
        <p className="mt-3 text-sm text-wabi-fg-muted">
          신상품과 특별한 소식을 가장 먼저 받아보세요
        </p>
        <NewsletterForm />
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

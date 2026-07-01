import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Clock, MapPin, AtSign, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { site } from "@/lib/site";

const featured = [
  { name: "세라믹 볼", en: "Handcrafted ceramic bowl", price: "86,000원" },
  { name: "백자 화병", en: "Minimalist vase", price: "45,000원" },
  { name: "백자 볼 세트", en: "Tea cup collection", price: "62,000원" },
  { name: "백자 티 세트", en: "Japanese teapot", price: "95,000원" },
];

const values = [
  { en: "Imperfection", ko: "불완전함 속에서 발견하는 독특한 아름다움" },
  { en: "Simplicity", ko: "단순함이 만들어내는 깊이있는 여백" },
  { en: "Authenticity", ko: "장인의 손길이 담긴 진정성있는 작품" },
];

export default function Home() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-wabi-subtle">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center px-5 py-28 text-center md:py-36">
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={560}
            height={278}
            priority
            className="h-20 w-auto md:h-28"
          />
          <h1 className="mt-8">
            <Image
              src="/brand/logo-wordmark.png"
              alt={`${site.name} — わび-さび`}
              width={720}
              height={239}
              priority
              className="h-10 w-auto md:h-12"
            />
          </h1>
          <p className="mt-5 text-sm tracking-wide text-wabi-fg-muted">
            {site.tagline}
          </p>
          <p className="mt-1 text-xs tracking-wide text-wabi-fg-muted">
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
        <ul className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {featured.map((p) => (
            <li key={p.name}>
              <Link href="/shop" className="group block">
                <div className="flex aspect-square items-center justify-center bg-wabi-muted">
                  <ImageIcon
                    className="size-8 text-wabi-fg-muted/40"
                    strokeWidth={1}
                    aria-hidden
                  />
                </div>
                <p className="mt-3 text-sm">{p.name}</p>
                <p className="text-xs text-wabi-fg-muted">{p.price}</p>
              </Link>
            </li>
          ))}
        </ul>
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
            <dl className="space-y-8">
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
            </dl>
            <div className="flex aspect-[4/3] items-center justify-center bg-wabi-muted text-sm text-wabi-fg-muted">
              Map will be here
            </div>
          </div>
        </div>
      </section>

      {/* ── Newsletter ─────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 text-center">
        <h2 className="text-xl font-semibold">Newsletter</h2>
        <p className="mt-3 text-sm text-wabi-fg-muted">
          신상품과 특별한 소식을 가장 먼저 받아보세요
        </p>
        <form className="mx-auto mt-8 flex max-w-md gap-2">
          <Input
            type="email"
            required
            placeholder="이메일을 입력하세요"
            aria-label="이메일 주소"
            className="rounded-none"
          />
          <Button
            type="submit"
            className="rounded-none bg-wabi-accent px-6 hover:bg-wabi-accent/90"
          >
            구독하기
          </Button>
        </form>
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
    <div className="flex gap-4">
      <span className="mt-0.5 text-wabi-fg" aria-hidden>
        {icon}
      </span>
      <div className="text-sm">
        <h3 className="font-medium">{title}</h3>
        <div className="mt-1 space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

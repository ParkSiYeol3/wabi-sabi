import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { Reveal } from "@/components/reveal";
import { HelixJourney } from "@/components/home/helix-journey";
import { SmoothScroll } from "@/components/home/smooth-scroll";
import { HomeAuthLinks } from "@/components/home/auth-links";
import { getHomeData } from "@/lib/queries/home";

// 홈도 전 사이트와 같은 단일 명조로 통일(대표님) — 기존 무드 폰트(마루부리·
// Cormorant·Space Mono)를 걷어내고 Noto Serif(KR+JP 폴백)만 쓴다.
// --ws-serif/--ws-mono 는 예전 이름만 유지하고 값은 명조로 맞춘다.

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ left?: string }>;
}) {
  // 홈 공개 데이터는 캐시된 단일 로더로 (#177). searchParams(탈퇴 안내)는 캐시 밖.
  // 로그인 여부는 서버에서 판정하지 않는다 — 소셜 로그인 직후·클라 라우터 캐시로
  // 상태를 놓쳐 로그인 사용자에게도 로그인 링크가 보이던 문제(#331 후속). CTA 아래
  // 로그인/회원가입 링크는 HomeAuthLinks(클라)가 스토어로 실시간 판정한다.
  const [{ philosophy, pillarLabels, pillars, cta }, { left }] =
    await Promise.all([getHomeData(), searchParams]);

  return (
    <div
      className="overflow-x-clip bg-[#f3ebdd] text-[#423c30] [--ws-mono:var(--font-cormorant),var(--font-maruburi),var(--font-noto-serif-jp),serif] [--ws-serif:var(--font-cormorant),var(--font-maruburi),var(--font-noto-serif-jp),serif]"
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
      {/* SEO 롱테일 키워드 — 홈은 곡선 무드라 시각적 제목이 없어, 크롤러·스크린리더용
          H1 에 브랜드+지역 키워드를 담는다(천안·신부동·그릇·편집샵). */}
      <h1 className="sr-only">
        와비사비 WABI-SABI — 천안 신부동 그릇·생활소품 편집샵
      </h1>
      <section className="pb-0 pt-6 md:pt-10">
        <HelixJourney pillarLabels={pillarLabels} pillarBodies={pillars} />
      </section>

      {/* ── 여정의 끝 — 그제야 브랜드. 선 끝에 로고가 바로 이어진다(#213 9차) ── */}
      <section className="px-6 pb-10 pt-4 text-center md:pt-6">
        <Reveal>
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={280}
            height={139}
            className="mx-auto h-14 w-auto md:h-20"
          />
          {/* 영어 로마자(Wabi-sabi) 제거·わび-さび 만 가운데(대표님 모바일 피드백) */}
          <h2 className="mt-6 [font-family:var(--ws-serif)] text-[clamp(30px,4.6vw,52px)] font-medium leading-[1.1]">
            わび-さび
          </h2>
        </Reveal>
        <Reveal>
          {/* 본문 글자 — 곡선 멘트 본문과 크기 통일(대표님) — 14px / md 17px */}
          <div className="mx-auto mt-8 max-w-155 space-y-4 [font-family:var(--ws-serif)] text-[14px] leading-[1.7] text-[#524a3a] md:text-[17px]">
            {philosophy.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Reveal>

        {/* 철학 3주(侘·寂·選)는 곡선 여정 안으로 이동(#225) — 여기선 반복하지 않는다 */}
        <Reveal>
          <div className="mt-14">
            {/* 채워지는 아웃라인 CTA(#231) — CtaLink 공유(오늘의 와비사비 버튼과 동일) */}
            <CtaLink href="/shop" label={cta} size="lg" />

            {/* CTA 아래 눈에 띄지 않는 회색 로그인/회원가입(대표님) — 비로그인만(클라 판정) */}
            <HomeAuthLinks />
          </div>
        </Reveal>
      </section>

      {/* 방문 안내는 Contact, 뉴스레터 구독은 추후 별도 위치 — 홈은 여정으로 끝난다(#197 피드백) */}
    </div>
  );
}

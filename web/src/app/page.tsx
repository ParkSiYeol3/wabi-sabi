import Image from "next/image";
import Link from "next/link";
import { CtaLink } from "@/components/cta-link";
import { Reveal } from "@/components/reveal";
import { HelixJourney } from "@/components/home/helix-journey";
import { SmoothScroll } from "@/components/home/smooth-scroll";
import { getHomeData } from "@/lib/queries/home";
import { createClient } from "@/lib/supabase/server";

// 홈도 전 사이트와 같은 단일 명조로 통일(대표님) — 기존 무드 폰트(마루부리·
// Cormorant·Space Mono)를 걷어내고 Noto Serif(KR+JP 폴백)만 쓴다.
// --ws-serif/--ws-mono 는 예전 이름만 유지하고 값은 명조로 맞춘다.

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ left?: string }>;
}) {
  // 홈 공개 데이터는 캐시된 단일 로더로 (#177). searchParams(탈퇴 안내)는 캐시 밖.
  // searchParams 를 읽어 이미 동적 렌더라 로그인 여부 조회 추가 비용은 없다.
  const supabase = await createClient();
  const [{ philosophy, pillarLabels, pillars, cta }, { left }, { data: auth }] =
    await Promise.all([
      getHomeData(),
      searchParams,
      supabase.auth.getUser(),
    ]);
  const loggedIn = !!auth.user;

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
      <h1 className="sr-only">WABI-SABI — 하루의 결을 따라 흐르는 그릇 셀렉트숍</h1>
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

        {/* 철학 3주(侘·寂·選)는 곡선 여정 안으로 이동(#225) — 여기선 반복하지 않는다 */}
        <Reveal>
          <div className="mt-14">
            {/* 채워지는 아웃라인 CTA(#231) — CtaLink 공유(오늘의 와비사비 버튼과 동일) */}
            <CtaLink href="/shop" label={cta} size="lg" />

            {/* CTA 아래 눈에 띄지 않는 회색 로그인/회원가입(대표님) — 비로그인만 */}
            {!loggedIn && (
              <p className="mt-5 [font-family:var(--ws-mono)] text-[11px] tracking-[1px] text-[#423c30]/45">
                <Link
                  href="/auth"
                  className="underline-offset-4 transition-colors hover:text-[#423c30]/80 hover:underline"
                >
                  로그인
                </Link>
                <span className="mx-2 text-[#423c30]/30">/</span>
                <Link
                  href="/auth?tab=signup"
                  className="underline-offset-4 transition-colors hover:text-[#423c30]/80 hover:underline"
                >
                  회원가입
                </Link>
              </p>
            )}
          </div>
        </Reveal>
      </section>

      {/* 방문 안내는 Contact, 뉴스레터 구독은 추후 별도 위치 — 홈은 여정으로 끝난다(#197 피드백) */}
    </div>
  );
}

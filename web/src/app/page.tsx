import Link from "next/link";
import Image from "next/image";
import { Cormorant_Garamond, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Reveal } from "@/components/reveal";
import { HelixJourney } from "@/components/home/helix-journey";
import { SmoothScroll } from "@/components/home/smooth-scroll";
import { getHomeData } from "@/lib/queries/home";

// 홈 전용 무드 폰트 (#209) — 대표님 피드백: 기존 궁서보다 얇은 궁서 느낌.
// (Hahmlet Light 는 진지함이 부족해 기각 → 마루부리 Light 로 교체.)
// 마루부리(네이버, SIL OFL — 셀프호스팅 합법)는 붓의 부리가 살아있는 전통
// 세리프라 궁서의 진지함을 유지하면서 Light 웨이트로 얇다. 셀프호스팅이라
// 외부 요청·CSP 변경 없음. 모든 기기(PC·모바일) 동일 렌더.
// 라틴 이탤릭은 Cormorant 가 먼저 받는다. 전역 토큰은 건드리지 않고 홈 래퍼의
// CSS 변수로만 쓴다(리스크 격리).
// 홈에서 쓰는 웨이트는 400(본문·이탤릭)·500(제목 font-medium)뿐 — 600 제외(#211).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
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
// KS X 1001 완성형 2350자 + 라틴·약물 서브셋(fonttools) — 원본 425KB → 201KB.
// 서브셋 밖 희귀 음절·한자는 스택 폴백(시스템 세리프)으로 렌더된다(#211).
// 원본은 hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/ 에서 재획득 가능.
const maruburi = localFont({
  src: "../fonts/MaruBuri-Light.subset.woff2",
  weight: "300",
  variable: "--font-maruburi",
  display: "swap",
});

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ left?: string }>;
}) {
  // 홈 공개 데이터는 캐시된 단일 로더로 (#177). searchParams(탈퇴 안내)는 캐시 밖.
  const [{ philosophy }, { left }] = await Promise.all([
    getHomeData(),
    searchParams,
  ]);

  return (
    <div
      className={`${cormorant.variable} ${spaceMono.variable} ${maruburi.variable} overflow-x-clip bg-[#f3ebdd] text-[#423c30] [--ws-serif:var(--font-cormorant),var(--font-maruburi),Gungsuh,GungSeo,serif] [--ws-mono:var(--font-ws-mono),monospace]`}
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
        <HelixJourney />
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

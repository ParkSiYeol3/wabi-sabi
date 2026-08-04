import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { CtaLink } from "@/components/cta-link";

export const metadata: Metadata = {
  title: "작가 · 만드는 사람들",
  description:
    "천안 와비사비(WABI-SABI)가 곁에 두는 그릇을 빚는 작가와 공방을 소개합니다 — 손의 흔적이 담긴 도자기, 그 뒤의 사람과 시간.",
};

// 작가 소개(MAKERS) — 대분류 예시 페이지(대표님 컨펌용, 시열님). 실제 작가 데이터가
// 아직 없어 레이아웃 데모용 샘플 카드로 구성한다(실명 대신 만드는 방식·스타일).
// 컨펌 후 실제 작가 사진·이름·이야기로 교체하거나, admin 편집형/DB 테이블로 승격한다.

type Maker = { title: string; craft: string; body: string };

const makers: Maker[] = [
  {
    title: "물레를 돌리는 손",
    craft: "백자 · 물레 성형",
    body: "같은 형태가 둘 없는 물레의 흔적. 손끝의 미세한 떨림까지 그릇의 표정으로 남깁니다.",
  },
  {
    title: "가마를 지키는 시간",
    craft: "분청 · 장작 가마",
    body: "불의 세기와 재의 흐름은 사람이 다 정할 수 없습니다. 우연이 남긴 결을 아름다움으로 받아들입니다.",
  },
  {
    title: "유약을 짓는 마음",
    craft: "청자 · 천연 유약",
    body: "재와 흙을 오래 곱씹어 만든 유약. 계절과 습도에 따라 매번 다른 빛을 냅니다.",
  },
];

export default function MakersPage() {
  return (
    <div className="bg-wabi-bg">
      {/* ── 히어로 ── */}
      <Container className="pt-16 pb-10 text-center md:pt-24">
        <Reveal>
          <p className="[font-family:var(--font-cormorant)] text-xs tracking-[0.4em] text-wabi-fg-muted">
            MAKERS
          </p>
          <h1 className="mt-4 text-[clamp(28px,5vw,40px)] font-medium leading-tight tracking-tight">
            만드는 사람들
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-[1.9] text-wabi-fg-muted">
            곁에 두는 그릇 하나에는
            <br />
            흙을 고르고 불을 지킨 누군가의 시간이 담겨 있습니다.
            <br />
            와비사비가 그 손과 이야기를 소개합니다.
          </p>
        </Reveal>
      </Container>

      {/* ── 작가 카드 ── */}
      <Container className="py-10">
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {makers.map((m) => (
            <li key={m.title}>
              <Reveal>
                {/* 사진 자리 — 실제 작가 사진으로 교체 예정 */}
                <div className="flex aspect-[4/5] items-center justify-center bg-wabi-bg-muted">
                  <ImageIcon
                    className="size-8 text-wabi-border"
                    strokeWidth={1}
                    aria-hidden
                  />
                </div>
                <p className="mt-5 [font-family:var(--font-cormorant)] text-[11px] uppercase tracking-[0.2em] text-wabi-fg-muted">
                  {m.craft}
                </p>
                <h2 className="mt-1.5 text-lg font-medium tracking-wide">
                  {m.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-wabi-fg-muted">
                  {m.body}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal>
          <p className="mt-14 text-center text-xs leading-relaxed text-wabi-fg-muted">
            작가와 공방 소개는 순차적으로 공개됩니다.
            <br />
            지금은 셀렉션으로 그 손길을 먼저 만나보세요.
          </p>
          <div className="mt-8 text-center">
            <CtaLink href="/shop" label="상품 보러 가기" size="lg" />
          </div>
        </Reveal>
      </Container>
    </div>
  );
}

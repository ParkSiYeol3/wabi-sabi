import type { Metadata } from "next";
import { Gift, MessageSquareHeart, ShoppingBag } from "lucide-react";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { ProductCard } from "@/components/product-card";
import { CtaLink } from "@/components/cta-link";
import { getProducts } from "@/lib/queries/products";
import { ADDONS, GIFT_WRAP_CODE, won } from "@/lib/addons";

export const metadata: Metadata = {
  title: "선물 · 마음을 담은 그릇",
  description:
    "천안 와비사비(WABI-SABI)에서 마음을 담아 선물하세요 — 손의 흔적이 담긴 그릇과 생활소품, 선물 포장·메시지 카드 안내. 소중한 분께 어울리는 선물 추천.",
};

// 선물(GIFT) — 대분류 신규 페이지(대표님). 기존 선물 포장 애드온(#253)과 연결해
// "선물로서의 와비사비"를 안내하고, 선물하기 좋은 상품을 큐레이션한다. 카피는
// 하드코딩(대표님 검토 후 조정) — 상품은 최신순으로 자동 채워 유지 부담이 없다.

const giftWrap = ADDONS.find((a) => a.code === GIFT_WRAP_CODE);
const shoppingBag = ADDONS.find((a) => a.code === "shopping_bag");

const wrapGuides = [
  {
    icon: Gift,
    title: "선물 포장",
    price: giftWrap ? won(giftWrap.price) : null,
    body: "정갈한 보자기·지함에 담아 그대로 건넬 수 있게 포장해 드립니다.",
  },
  {
    icon: MessageSquareHeart,
    title: "메시지 카드",
    price: null,
    body: "선물 포장을 선택하시면 보내는 분과 짧은 메시지를 함께 담아 드립니다.",
  },
  {
    icon: ShoppingBag,
    title: "쇼핑백",
    price: shoppingBag ? won(shoppingBag.price) : null,
    body: "직접 전하실 때 어울리는 단정한 쇼핑백을 더하실 수 있습니다.",
  },
];

export default async function GiftPage() {
  // 선물 추천 — 최신 상품에서 자동 큐레이션(유지 부담 0). 재고 관계없이 8점.
  const picks = await getProducts({ sort: "newest", limit: 8 });

  return (
    <div className="bg-wabi-bg">
      {/* ── 히어로 ── */}
      <Container className="pt-16 pb-10 text-center md:pt-24">
        <Reveal>
          <p className="[font-family:var(--font-cormorant)] text-xs tracking-[0.4em] text-wabi-fg-muted">
            GIFT
          </p>
          <h1 className="mt-4 text-[clamp(28px,5vw,40px)] font-medium leading-tight tracking-tight">
            마음을 담은 그릇
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-[1.9] text-wabi-fg-muted">
            손의 흔적이 남은 그릇 하나를 고르는 일은
            <br />
            받는 이의 하루를 오래 헤아리는 일입니다.
            <br />
            와비사비가 그 마음을 정갈하게 포장해 드립니다.
          </p>
        </Reveal>
      </Container>

      {/* ── 선물 포장 안내 ── */}
      <Container className="py-10">
        <Reveal>
          <ul className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
            {wrapGuides.map((g) => (
              <li key={g.title} className="text-center">
                <g.icon
                  className="mx-auto size-7 text-wabi-fg"
                  strokeWidth={1.2}
                  aria-hidden
                />
                <p className="mt-4 text-sm font-medium">
                  {g.title}
                  {g.price && (
                    <span className="ml-1.5 text-xs text-wabi-fg-muted">
                      {g.price}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-wabi-fg-muted">
                  {g.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-xs text-wabi-fg-muted">
            선물 포장·쇼핑백은 각 상품 상세 페이지에서 선택하실 수 있습니다.
          </p>
        </Reveal>
      </Container>

      {/* ── 선물 추천 ── */}
      {picks.length > 0 && (
        <Container className="py-14">
          <Reveal>
            <h2 className="text-center text-lg font-medium tracking-wide">
              선물하기 좋은 그릇
            </h2>
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {picks.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
          <div className="mt-14 text-center">
            <CtaLink href="/shop" label="전체 상품 보기" size="lg" />
          </div>
        </Container>
      )}
    </div>
  );
}

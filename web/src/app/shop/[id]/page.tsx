import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { RestockButton } from "@/components/restock-button";
import { WishlistButton } from "@/components/wishlist-button";
import { ReviewSection } from "@/components/review-section";
import { Price } from "@/components/price";
import { getCachedProductDetail } from "@/lib/queries/product-detail";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getCachedProductDetail(id);
  if (!bundle) return { title: "상품을 찾을 수 없음" };
  const { product } = bundle;
  // `??` 는 빈 문자열("") 설명을 통과시켜 meta description 이 비어짐(Lighthouse SEO 감점) → `||`
  const description = product.description || `${product.name} — WABI-SABI`;
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      // 상품 실사진이 사이트 기본 OG(opengraph-image.tsx)를 덮어씀
      images: product.images.slice(0, 1),
    },
  };
}

// #16 SEO: Product 구조화 데이터 — 검색 결과 리치 스니펫(가격·재고·별점).
// JSON.stringify 결과의 `<` 를 이스케이프해 상품 필드 경유 script 탈출 차단.
function productJsonLd(
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    description: string | null;
    images: string[];
  },
  stats: { count: number; average: number },
) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    // meta description 과 동일 폴백 — 빈 설명이어도 리치 스니펫 description 유지
    description: product.description || `${product.name} — WABI-SABI`,
    image: product.images,
    brand: { "@type": "Brand", name: "WABI-SABI" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/shop/${product.id}`,
      priceCurrency: "KRW",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    // 별점은 리뷰가 있을 때만 — reviewCount 0 이면 구글이 리치결과를 거부한다.
    // (undefined 키는 JSON.stringify 가 제거한다.)
    aggregateRating:
      stats.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: stats.average,
            reviewCount: stats.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  }).replace(/</g, "\\u003c");
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 공개 데이터(상품·관련상품·평점)는 캐시된 번들로 (#181).
  const bundle = await getCachedProductDetail(id);
  if (!bundle) notFound();
  const { product, related, stats: reviewStats } = bundle;

  // 위시리스트 초기 상태 (로그인 시) — 사용자별이라 캐시 밖.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let wished = false;
  // 재입고 알림 구독 여부 (#166) — 버튼이 품절일 때만 뜨므로 그때만 조회한다.
  let restockSubscribed = false;
  if (user) {
    const { data: wish } = await supabase
      .from("wishlist")
      .select("id")
      .eq("product_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    wished = !!wish;

    if (product.stock <= 0) {
      const { data: restock } = await supabase
        .from("restock_subscriptions")
        .select("id")
        .eq("product_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      restockSubscribed = !!restock;
    }
  }

  const main = product.images[0] ?? null;
  const specs = [
    { label: "소재", value: product.material },
    { label: "원산지", value: product.origin },
    { label: "사이즈", value: product.size },
    { label: "주의사항", value: product.care },
  ].filter((s) => s.value);

  return (
    <Container className="py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd(product, reviewStats) }}
      />
      {/* 히어로 — 첫(메인) 사진 + 정보. 스크롤을 내리면 정보와 함께 위로 사라지고
          아래 스캐터 사진만 이어진다(대표님 시안 — 정보를 우측에 고정하지 않음). */}
      <div className="grid items-start gap-12 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden bg-wabi-muted">
          {main ? (
            <Image
              src={main}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
              preload
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon
                className="size-12 text-wabi-fg-muted/40"
                strokeWidth={1}
                aria-hidden
              />
            </div>
          )}
        </div>

        {/* 정보 — 히어로에만. sticky 아님(첫 사진과 함께 스크롤). */}
        <div>
          {product.category && (
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="text-xs text-wabi-fg-muted hover:text-wabi-fg"
            >
              {product.category.name_en}
            </Link>
          )}
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <WishlistButton productId={product.id} initial={wished} />
          </div>
          <p className="mt-4 text-2xl font-semibold">
            <Price value={product.price} />
          </p>

          {product.description && (
            <p className="mt-6 text-sm leading-7 text-wabi-fg-muted">
              {product.description}
            </p>
          )}

          <ProductDetailActions
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              image: main,
            }}
            stock={product.stock}
          />

          {/* 품절이면 재입고 알림 (#166) — 로그인 사용자만(발송 주소 = 계정 이메일) */}
          {product.stock <= 0 &&
            (user ? (
              <RestockButton
                productId={product.id}
                initial={restockSubscribed}
              />
            ) : (
              <p className="mt-4 text-sm text-wabi-fg-muted">
                <Link
                  href={`/auth?redirect=/shop/${product.id}`}
                  className="underline hover:text-wabi-fg"
                >
                  로그인
                </Link>{" "}
                후 재입고 알림을 받을 수 있습니다.
              </p>
            ))}

          {specs.length > 0 && (
            <dl className="mt-10 divide-y divide-wabi-border border-t border-wabi-border text-sm">
              {specs.map((s) => (
                <div key={s.label} className="flex gap-4 py-3">
                  <dt className="w-20 shrink-0 text-wabi-fg-muted">
                    {s.label}
                  </dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* 교환·반품 안내 (#241, 갭 분석 3) — 구매 결정 순간에 정보가 없어
              /legal 까지 가야 했다. 확정된 것만 요약(배송비 금액은 미정이라 제외,
              허위표시 방지). 수공예 개체차 고지는 도자기 클레임 예방에 특히 중요.
              details/summary 무JS 접이식(홈·shop 사이드바와 동일 패턴). */}
          <details className="mt-8 border-t border-wabi-border pt-4 text-sm">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <span className="inline-flex w-full items-center justify-between">
                교환·반품 안내
                <span aria-hidden className="text-wabi-fg-muted">
                  ＋
                </span>
              </span>
            </summary>
            <div className="mt-4 space-y-3 text-wabi-fg-muted">
              <p>
                수공예 도자기·공예품은 하나씩 손으로 만들어 색상·질감·크기·굽의
                형태에 <strong className="font-medium text-wabi-fg">개체별 미세한
                차이</strong>가 있습니다. 이는 하자가 아닌 고유한 특성입니다.
              </p>
              <p>
                단순 변심에 의한 청약철회는 상품 수령 후{" "}
                <strong className="font-medium text-wabi-fg">7일 이내</strong>에
                요청할 수 있으며, 반품 배송비는 고객이 부담합니다. 파손·오배송 등
                판매자 귀책 사유는 수령 후{" "}
                <strong className="font-medium text-wabi-fg">3개월 이내</strong>에
                무료로 교환·환불해 드립니다.
              </p>
              <Link
                href="/legal/refund"
                className="inline-block underline underline-offset-2 hover:text-wabi-fg"
              >
                교환·환불 안내 자세히 보기 →
              </Link>
            </div>
          </details>
        </div>
      </div>

      {/* 나머지 사진 — 전체 폭에 불규칙 흩뿌림(중앙 정렬 없음). 스크롤 시 이어짐. */}
      <ProductGallery images={product.images.slice(1)} name={product.name} />

      {/* 리뷰 (대표님 피드백 — 게시판 3종) */}
      <ReviewSection productId={product.id} currentUserId={user?.id ?? null} />

      {/* 관련 상품 (WSB-012) */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-lg font-medium">관련 상품</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}

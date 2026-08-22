import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductImageZoom } from "@/components/product/product-image-zoom";
import { ProductDetailActions } from "@/components/product/product-detail-actions";
import { RestockButton } from "@/components/product/restock-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { ReviewSection } from "@/components/product/review-section";
import { Price } from "@/components/product/price";
import { getCachedProductDetail } from "@/lib/queries/product-detail";
import {
  getPublicContent,
  ADDON_IMAGE_KEYS,
  addonImageKey,
  SHIPPING_INFO_KEY,
  DEFAULT_SHIPPING_INFO,
  SHIPPING_FEE_KEY,
  DEFAULT_SHIPPING_FEE,
  CARE_USAGE_KEY,
  DEFAULT_CARE_USAGE,
  CARE_MAINTAIN_KEY,
  DEFAULT_CARE_MAINTAIN,
} from "@/lib/queries/content";
import { enabledAddons } from "@/lib/addons";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";
import { BASE_SHIPPING_FEE } from "@/lib/shipping";

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
      itemCondition: "https://schema.org/NewCondition",
      // 가격 유효기간 — 구글이 없으면 상품 리치결과 경고를 낸다. 연 단위로 넉넉히.
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      // 배송 정보 — 구글 상품 리치결과/무료 리스팅에 "배송비" 노출. 기본 배송비 기준
      // (8만원 이상 무료는 조건부라 schema 로 표현 어려워 기본요금만 명시).
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: BASE_SHIPPING_FEE,
          currency: "KRW",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "KR",
        },
      },
      // 반품 정책 — 전자상거래법 청약철회(수령 후 7일, 반품비 구매자 부담).
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "KR",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnShippingFees",
      },
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

// 빵부스러기 구조화 데이터 — 검색결과에 SHOP › 카테고리 › 상품 경로 노출(클릭률↑).
// 카테고리 라벨은 name_en 우선(대분류 "-"·빈값이면 name_ko) — shop 라벨 규칙과 통일.
function breadcrumbJsonLd(product: {
  id: string;
  name: string;
  category: { slug: string; name_en: string; name_ko: string } | null;
}) {
  const items: object[] = [
    { "@type": "ListItem", position: 1, name: "SHOP", item: `${SITE_URL}/shop` },
  ];
  if (product.category) {
    const c = product.category;
    const label = c.name_en?.trim() && c.name_en !== "-" ? c.name_en : c.name_ko;
    items.push({
      "@type": "ListItem",
      position: 2,
      name: label,
      item: `${SITE_URL}/shop?category=${c.slug}`,
    });
  }
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: product.name,
    item: `${SITE_URL}/shop/${product.id}`,
  });
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
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

  // 이 상품 상세에 노출할 추가옵션(0048) — 대표님이 상품별로 켠 것만.
  const productAddons = enabledAddons(product.enabledAddons);
  // 추가 옵션 썸네일 + 배송 안내 문구를 한 번에(site_content). 배송 안내는 미저장 시
  // 기본 문구로 폴백(토스 심사 배송기간 명시 — 대표님이 어드민에서 확정).
  const contentMap = await getPublicContent([
    ...ADDON_IMAGE_KEYS,
    SHIPPING_INFO_KEY,
    SHIPPING_FEE_KEY,
    CARE_USAGE_KEY,
    CARE_MAINTAIN_KEY,
  ]);
  const addonImages = Object.fromEntries(
    productAddons.map((a) => [a.code, contentMap[addonImageKey(a.code)]]),
  );
  const shippingInfo = contentMap[SHIPPING_INFO_KEY] || DEFAULT_SHIPPING_INFO;
  const shippingFee = contentMap[SHIPPING_FEE_KEY] || DEFAULT_SHIPPING_FEE;
  // 사용·관리 안내(대표님) — 미저장 시 기본 문안. 빈 값이면 해당 소제목 미표시.
  const careUsage = contentMap[CARE_USAGE_KEY] ?? DEFAULT_CARE_USAGE;
  const careMaintain = contentMap[CARE_MAINTAIN_KEY] ?? DEFAULT_CARE_MAINTAIN;

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
    // 모바일 하단 스티키 구매 바가 콘텐츠를 가리지 않게 아래 여백 확보(데스크톱은 무바).
    <Container className="pt-16 pb-32 md:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd(product, reviewStats) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(product) }}
      />
      {/* 히어로 — 첫(메인) 사진 + 정보. 스크롤을 내리면 정보와 함께 위로 사라지고
          아래 스캐터 사진만 이어진다(대표님 시안 — 정보를 우측에 고정하지 않음). */}
      <div className="grid items-start gap-12 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden bg-wabi-muted">
          {main ? (
            <ProductImageZoom
              src={main}
              alt={product.name}
              sizes="(max-width: 768px) 100vw, 45vw"
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
          {/* 품절을 상세에서도 한눈에(대표님) — 히어로 사진 위 오버레이. 목록 카드와
              동일 톤. pointer-events-none 로 아래 확대 클릭은 그대로 통과. */}
          {product.stock <= 0 && (
            <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/65 text-lg tracking-wide text-wabi-fg backdrop-blur-[1px]">
              Out of Stock
            </span>
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

          {/* 관리자가 입력한 줄바꿈(엔터)을 그대로 보존 — 기본 <p>는 개행을 공백으로
              합쳐 문단 구분이 사라진다. whitespace-pre-line 로 엔터=줄바꿈,
              빈 줄=문단 간격이 그대로 반영된다(대표님). */}
          {product.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-7 text-wabi-fg-muted">
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
            options={product.options}
            addons={productAddons}
            addonImages={addonImages}
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
                  <dd className="font-numeric">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* 배송 안내 (토스 심사 보완요청 ① — 배송기간 명시). 문구는 대표님이
              어드민에서 편집(SHIPPING_INFO_KEY), 미저장 시 기본값 폴백. 줄바꿈 보존.
              대표님 요청(2026-08-20): 접이식 대신 항상 펼쳐 글자가 바로 보이게. */}
          <div className="mt-8 border-t border-wabi-border pt-4 text-sm">
            <p className="font-medium text-wabi-fg">배송 안내</p>
            <div className="mt-3 space-y-2 font-numeric text-wabi-fg">
              <p className="whitespace-pre-line">{shippingInfo}</p>
              <p className="whitespace-pre-line">{shippingFee}</p>
            </div>
          </div>

          {/* 교환·반품 안내 (#241, 갭 분석 3) — 구매 결정 순간에 정보가 없어
              /legal 까지 가야 했다. 확정된 것만 요약(배송비 금액은 미정이라 제외,
              허위표시 방지). 도자기 개체차 고지는 클레임 예방에 특히 중요.
              details/summary 무JS 접이식(홈·shop 사이드바와 동일 패턴). */}
          <details className="border-t border-wabi-border pt-4 text-sm">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <span className="inline-flex w-full items-center justify-between">
                교환·반품 안내
                <span aria-hidden className="text-wabi-fg-muted">
                  ＋
                </span>
              </span>
            </summary>
            <div className="mt-4 space-y-3 font-numeric text-wabi-fg-muted">
              <p>
                도자기·유리 등 일부 기물은 소재와 제작 과정의 특성상 색상·질감·크기·
                굽의 형태에 <strong className="font-medium text-wabi-fg">개체별
                미세한 차이</strong>가 있을 수 있습니다. 이는 하자가 아닌 고유한
                특성입니다.
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

      {/* 사용 및 관리 (대표님 — 사진과 리뷰 사이). 문구는 어드민 편집(site_content).
          들여쓰기 없이 흐르는 문단(기본값은 한 문단, 편집 시 개행 반영 pre-line). */}
      {(careUsage || careMaintain) && (
        <section className="mt-14 max-w-2xl border-t border-wabi-border pt-8 text-sm">
          <h2 className="text-base font-medium text-wabi-fg">사용 및 관리</h2>
          <div className="mt-4 space-y-6 text-wabi-fg-muted">
            {careUsage && (
              <div>
                <p className="mb-1.5 font-medium text-wabi-fg">사용</p>
                <p className="whitespace-pre-line leading-relaxed">
                  {careUsage}
                </p>
              </div>
            )}
            {careMaintain && (
              <div>
                <p className="mb-1.5 font-medium text-wabi-fg">세척과 관리</p>
                <p className="whitespace-pre-line leading-relaxed">
                  {careMaintain}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

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

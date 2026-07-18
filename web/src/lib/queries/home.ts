import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { ProductCardData } from "@/components/product-card";
import type { ShowcaseItem } from "@/components/scroll-showcase";
import {
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  toParagraphs,
} from "@/lib/queries/content";

// 홈 캐시 태그 — 상품·소개문구가 바뀌면 어드민 액션이 이 태그를 무효화한다.
export const HOME_CONTENT_TAG = "home-content";

const FEATURED_COUNT = 4;
const POOL_LIMIT = 12;

export type JourneyProduct = {
  id: string;
  name: string;
  price: number;
  image: string | null;
};

export type HomeData = {
  featured: ProductCardData[];
  heroImages: string[];
  showcaseItems: ShowcaseItem[];
  journey: JourneyProduct[];
  philosophy: string[];
};

type Row = {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: unknown;
  is_monthly: boolean;
  categories: { name_en: string } | null;
};

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

// 홈에 필요한 공개 데이터를 한 번에 로드한다. 이전엔 featured(내부 2쿼리)+slidePool+
// 소개문구를 매 요청 4~5회 왕복했다. 여기선 활성 상품 12개 + 소개문구 = 2쿼리로 통합하고,
// featured·히어로 이미지·쇼케이스를 그 결과에서 파생한다.
async function loadHomeData(): Promise<HomeData> {
  const db = createPublicClient();

  const [{ data: products }, { data: content }] = await Promise.all([
    db
      .from("products")
      .select("id, name, price, stock, images, is_monthly, categories(name_en)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(POOL_LIMIT)
      .returns<Row[]>(),
    db
      .from("site_content")
      .select("value")
      .eq("key", PHILOSOPHY_KEY)
      .maybeSingle<{ value: string }>(),
  ]);

  const pool = products ?? [];
  const toCard = (p: Row): ProductCardData => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: firstImage(p.images),
    category: p.categories?.name_en,
  });

  // Featured — '이 달의 상품'(is_monthly) 우선, 모자라면 최신으로 채운다.
  const monthly = pool.filter((p) => p.is_monthly);
  const seen = new Set(monthly.map((p) => p.id));
  const featured = [...monthly, ...pool.filter((p) => !seen.has(p.id))]
    .slice(0, FEATURED_COUNT)
    .map(toCard);

  // 히어로 배경·쇼케이스 — 이미지가 있는 상품에서. flatMap 으로 한 번에 좁혀
  // firstImage 중복 호출·타입 단언(as/!)을 없앤다.
  const withImage = pool.flatMap((p) => {
    const image = firstImage(p.images);
    return image ? [{ id: p.id, name: p.name, price: p.price, image }] : [];
  });
  const heroImages = [...new Set(withImage.map((p) => p.image))].slice(0, 6);
  const showcaseItems: ShowcaseItem[] = withImage.map(
    ({ id, name, image }) => ({ id, name, image }),
  ).slice(0, 5);

  // 헬릭스 여정 모멘트(#197) — 사진 있는 상품 우선, 모자라면 최신으로 채움(플레이스홀더).
  const journeyIds = new Set(withImage.map((p) => p.id));
  const journey: JourneyProduct[] = [
    ...withImage.map(({ id, name, price, image }) => ({ id, name, price, image })),
    ...pool
      .filter((p) => !journeyIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, price: p.price, image: null })),
  ].slice(0, 5);

  const philosophy = toParagraphs(content?.value?.trim() || DEFAULT_PHILOSOPHY);

  return { featured, heroImages, showcaseItems, journey, philosophy };
}

// 120초 캐시 + 태그. 상품·콘텐츠는 자주 바뀌지 않고, 바뀌면 어드민이 태그를 무효화한다.
export const getHomeData = unstable_cache(loadHomeData, ["home-data"], {
  revalidate: 120,
  tags: [HOME_CONTENT_TAG],
});

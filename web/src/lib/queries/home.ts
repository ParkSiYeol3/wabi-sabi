import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  toParagraphs,
} from "@/lib/queries/content";

// 홈 캐시 태그 — 상품·소개문구가 바뀌면 어드민 액션이 이 태그를 무효화한다.
export const HOME_CONTENT_TAG = "home-content";

// 헬릭스 모멘트는 5개지만 사진 있는 상품을 고르므로 여유분을 가져온다.
const POOL_LIMIT = 12;

export type JourneyProduct = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  comment: string | null; // 설명 첫 문장 — 없으면 컴포넌트가 모멘트 기본 문장 사용
};

export type HomeData = {
  journey: JourneyProduct[];
  philosophy: string[];
};

type Row = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  images: unknown;
};

// 상품 설명 첫 문장 — 헬릭스 카드의 한 줄 코멘트(#197). 길면 잘라 여운만 남긴다.
function firstSentence(text: string | null): string | null {
  if (!text) return null;
  const s = text.split(/\n|(?<=[.!?。])\s/)[0]?.trim();
  if (!s) return null;
  return s.length > 46 ? `${s.slice(0, 45)}…` : s;
}

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

// 홈에 필요한 공개 데이터(헬릭스 여정 상품 + 소개문구)를 2쿼리로 로드한다.
// 구 홈의 featured·히어로 이미지·쇼케이스 파생은 헬릭스 리디자인(#197)으로
// 소비처가 사라져 제거했다(#207) — 캐시 페이로드도 그만큼 준다.
async function loadHomeData(): Promise<HomeData> {
  const db = createPublicClient();

  const [{ data: products }, { data: content }] = await Promise.all([
    db
      .from("products")
      .select("id, name, price, description, images")
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

  // 헬릭스 여정 모멘트(#197) — 사진 있는 상품 우선, 모자라면 최신으로 채움(플레이스홀더).
  const withImage = pool.flatMap((p) => {
    const image = firstImage(p.images);
    return image
      ? [
          {
            id: p.id,
            name: p.name,
            price: p.price,
            image,
            comment: firstSentence(p.description),
          },
        ]
      : [];
  });
  const journeyIds = new Set(withImage.map((p) => p.id));
  const journey: JourneyProduct[] = [
    ...withImage,
    ...pool
      .filter((p) => !journeyIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: null,
        comment: firstSentence(p.description),
      })),
  ].slice(0, 6);

  const philosophy = toParagraphs(content?.value?.trim() || DEFAULT_PHILOSOPHY);

  return { journey, philosophy };
}

// 120초 캐시 + 태그. 상품·콘텐츠는 자주 바뀌지 않고, 바뀌면 어드민이 태그를 무효화한다.
export const getHomeData = unstable_cache(loadHomeData, ["home-data"], {
  revalidate: 120,
  tags: [HOME_CONTENT_TAG],
});

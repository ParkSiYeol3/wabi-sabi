import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  toParagraphs,
} from "@/lib/queries/content";

// 홈 캐시 태그 — 소개문구가 바뀌면 어드민 액션이 이 태그를 무효화한다.
export const HOME_CONTENT_TAG = "home-content";

export type HomeData = {
  philosophy: string[];
};

// 홈에 필요한 공개 데이터. 헬릭스 여정의 상품 카드가 철학 멘트(정적)로
// 바뀌면서(#225) 상품 쿼리·파생이 사라져 소개문구 1쿼리만 남았다.
async function loadHomeData(): Promise<HomeData> {
  const db = createPublicClient();

  const { data: content } = await db
    .from("site_content")
    .select("value")
    .eq("key", PHILOSOPHY_KEY)
    .maybeSingle<{ value: string }>();

  const philosophy = toParagraphs(content?.value?.trim() || DEFAULT_PHILOSOPHY);

  return { philosophy };
}

// 120초 캐시 + 태그. 콘텐츠는 자주 바뀌지 않고, 바뀌면 어드민이 태그를 무효화한다.
export const getHomeData = unstable_cache(loadHomeData, ["home-data"], {
  revalidate: 120,
  tags: [HOME_CONTENT_TAG],
});

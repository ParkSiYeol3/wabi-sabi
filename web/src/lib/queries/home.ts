import { unstable_cache } from "next/cache";
import {
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  HOME_PILLAR_KEYS,
  DEFAULT_PILLARS,
  HOME_CTA_KEY,
  DEFAULT_HOME_CTA,
  CONTENT_KEYS,
  getPublicContent,
  toParagraphs,
} from "@/lib/queries/content";

// 홈 캐시 태그 — 편집 콘텐츠가 바뀌면 어드민 액션이 이 태그를 무효화한다.
export const HOME_CONTENT_TAG = "home-content";

export type HomeData = {
  philosophy: string[];
  pillars: string[]; // 철학 3주 본문(HOME_PILLAR_KEYS 순서, 라벨은 코드 고정)
  cta: string; // 홈 하단 Shop CTA 문구
};

// 홈에 필요한 공개 편집 콘텐츠. 상품 카드가 철학 멘트로 바뀌면서(#225) 상품
// 쿼리는 사라졌고, 이제 편집 가능 문구(#245)를 site_content 에서 한 번에 읽는다.
async function loadHomeData(): Promise<HomeData> {
  const content = await getPublicContent(CONTENT_KEYS);

  const philosophy = toParagraphs(
    content[PHILOSOPHY_KEY]?.trim() || DEFAULT_PHILOSOPHY,
  );
  const pillars = HOME_PILLAR_KEYS.map(
    (k) => content[k]?.trim() || DEFAULT_PILLARS[k],
  );
  const cta = content[HOME_CTA_KEY]?.trim() || DEFAULT_HOME_CTA;

  return { philosophy, pillars, cta };
}

// 120초 캐시 + 태그. 콘텐츠는 자주 바뀌지 않고, 바뀌면 어드민이 태그를 무효화한다.
export const getHomeData = unstable_cache(loadHomeData, ["home-data"], {
  revalidate: 120,
  tags: [HOME_CONTENT_TAG],
});

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

// 편집 가능한 사이트 콘텐츠 (#160·#245) — 대표님이 어드민에서 고칠 수 있는 텍스트.
// 값이 없으면(미저장) 기본 문구로 폴백한다. site_content(key,value) 단일 테이블.

export const PHILOSOPHY_KEY = "philosophy";

// 홈 하드코딩 문구를 편집 가능하게 이전(#245·#247). 한자(侘·寂·選)만 브랜드
// 상징이라 코드 고정, 제목(라벨)·본문·CTA 는 편집한다. 키는 saveContent enum·
// admin 폼과 동기. 라벨/본문 키는 같은 순서(와비→사비→큐레이션)로 대응한다.
export const HOME_PILLAR_KEYS = [
  "home_pillar_wabi",
  "home_pillar_sabi",
  "home_pillar_select",
] as const;
export const HOME_PILLAR_LABEL_KEYS = [
  "home_pillar_wabi_label",
  "home_pillar_sabi_label",
  "home_pillar_select_label",
] as const;
export const HOME_CTA_KEY = "home_cta";

// 편집 가능한 전체 키 — 액션 enum·타입 안전의 단일 출처.
export const CONTENT_KEYS = [
  PHILOSOPHY_KEY,
  ...HOME_PILLAR_LABEL_KEYS,
  ...HOME_PILLAR_KEYS,
  HOME_CTA_KEY,
] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

// 철학 소개 기본 문구 — 문단은 빈 줄로 구분한다(렌더 시 <p> 로 분리).
export const DEFAULT_PHILOSOPHY = `わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는 일본의 미학입니다.

우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를 큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한 작품입니다.

10년 넘게 오가바의 도자기로 만든 라면을 먹어온 우리가, 생각한 도자기를 만들어주었으면 하고 오가바 작가님께 주문을 했습니다. 주문하신 분들만이 가지실 수 있는 특별한 작품들입니다.`;

// 홈 철학 3주 본문 기본값(한자는 helix-journey 에 고정). 키 순서와 1:1 대응.
export const DEFAULT_PILLARS: Record<(typeof HOME_PILLAR_KEYS)[number], string> = {
  home_pillar_wabi: "소박함과 절제. 덜어낼수록 선명해지는 본질을 담습니다.",
  home_pillar_sabi: "시간의 흔적. 낡음과 결이 만드는 고요한 깊이를 아낍니다.",
  home_pillar_select: "오래 곁에 둘 것만을. 만든 이와 쓰는 이의 하루를 잇습니다.",
};

// 홈 철학 3주 제목(라벨) 기본값 — 편집 가능(#247). 키 순서와 1:1 대응.
export const DEFAULT_PILLAR_LABELS: Record<
  (typeof HOME_PILLAR_LABEL_KEYS)[number],
  string
> = {
  home_pillar_wabi_label: "01 — 와비 / WABI",
  home_pillar_sabi_label: "02 — 사비 / SABI",
  home_pillar_select_label: "03 — 큐레이션 / SELECT",
};

export const DEFAULT_HOME_CTA = "당신의 하루에 놓일 그릇, 천천히 둘러보세요 →";

// key 에 해당하는 저장 값. 없거나 오류면 null(호출부에서 기본값 폴백).
// 사용자 세션 클라이언트 — 어드민 편집 화면 등 캐시 밖 조회에 쓴다.
export async function getSiteContent(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = data?.value?.trim();
  return value ? value : null;
}

// 공개 홈에서 여러 키를 한 번에 — 쿠키리스 anon 클라이언트(캐시 로더 안에서 호출).
// 키→값 맵을 돌려주고, 없는 키는 호출부가 기본값으로 폴백한다.
export async function getPublicContent(
  keys: readonly string[],
): Promise<Record<string, string>> {
  const db = createPublicClient();
  const { data } = await db
    .from("site_content")
    .select("key, value")
    .in("key", keys as string[]);
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    const v = row.value?.trim();
    if (v) map[row.key] = v;
  }
  return map;
}

// 빈 줄로 구분된 텍스트를 문단 배열로. 빈 문단은 제거.
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { ADDONS } from "@/lib/addons";
import { SHIPPING_NOTICE } from "@/lib/shipping";

// 편집 가능한 사이트 콘텐츠 (#160·#245) — 대표님이 어드민에서 고칠 수 있는 텍스트.
// 값이 없으면(미저장) 기본 문구로 폴백한다. site_content(key,value) 단일 테이블.

export const PHILOSOPHY_KEY = "philosophy";

// About 매장 사진 URL (대표님 지시 — 소개 문단 옆 이미지). site_content 에 URL 만
// 저장하고, 파일은 스토리지에 올린다. 값이 없으면 About 은 로고 마크로 폴백한다.
// 텍스트 편집(CONTENT_KEYS)과 달리 업로드라 별도 액션(saveAboutImage)이 다룬다.
export const ABOUT_IMAGE_KEY = "about_image";

// 추가 옵션(애드온) 썸네일 이미지 — 코드별 site_content 키(예: addon_image_gift_wrap).
// 상품 상세의 옵션 목록에 작은 사진으로 표시된다. 값이 없으면 상세에서 사진 자리
// (플레이스홀더)만 확보해 둔다. About 사진과 동일한 업로드 패턴(스토리지 URL 저장,
// saveAddonImage 액션). 가격·이름은 코드(lib/addons.ts) 진실, 사진만 DB.
export const addonImageKey = (code: string) => `addon_image_${code}`;
export const ADDON_IMAGE_KEYS = ADDONS.map((a) => addonImageKey(a.code));

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

// 정식 오픈 준비중 안내(대표님) — 토스 라이브·실상품·가격 확정 전, 손님이 결제를
// 시도했다 실패하지 않도록 진입 시 안내 모달을 띄운다. on/off 는 대표님이 어드민에서
// 조작(값 "on" 이면 표시). 문구(PREP_NOTICE_TEXT_KEY)는 편집 가능(CONTENT_KEYS).
// SEO 는 다치지 않는다 — 본문은 그대로 SSR 되고, 닫으면 자유 열람이라 색인 유지.
export const PREP_NOTICE_KEY = "prep_notice"; // 토글: 값 "on" = 표시
export const PREP_NOTICE_TEXT_KEY = "prep_notice_text"; // 안내 본문(편집 가능)
export const DEFAULT_PREP_NOTICE_TEXT =
  "지금은 정식 오픈을 준비하는 기간입니다. 둘러보시는 건 자유로우니 편히 구경해 주세요.";

// About "고르는 기준" — 3항목(제목+본문) + 안내문. 편집 가능(#). 홈 철학 3주와
// 같은 배열 패턴. 키 순서 = 화면 표시 순서(01·02·03).
export const CRITERIA_LABEL_KEYS = [
  "criteria_1_label",
  "criteria_2_label",
  "criteria_3_label",
] as const;
export const CRITERIA_BODY_KEYS = [
  "criteria_1_body",
  "criteria_2_body",
  "criteria_3_body",
] as const;
export const CRITERIA_SUBTITLE_KEY = "criteria_subtitle";
// 섹션 제목(기본 "고르는 기준") — 대표님이 섹션 이름 자체도 바꿀 수 있게.
export const CRITERIA_HEADING_KEY = "criteria_heading";

// 배송 안내 문구 — 상품 상세·환불정책에 노출(토스 심사 보완요청 ①: 배송기간 명시).
// 실제 발송 소요 영업일은 대표님이 어드민에서 확정·수정한다(기본값은 안전한 예시).
export const SHIPPING_INFO_KEY = "shipping_info";
export const DEFAULT_SHIPPING_INFO =
  "결제가 확인되면 평균 2~5영업일 이내에 상품을 발송합니다. 주말·공휴일은 발송이 제외되며, 택배사 사정에 따라 수령까지 시간이 더 걸릴 수 있습니다.";

// 배송비 안내 문구 — 배송기간과 짝(토스 심사: 배송비 표시). 실제 청구는 정책 상수
// (lib/shipping: 8만원 이상 무료·미만 3,500원)로 서버가 계산한다. 기본 문구는 그
// 상수에서 파생(SHIPPING_NOTICE)해 안내와 청구액이 어긋나지 않게 한다. 금액·기준을
// 바꾸려면 lib/shipping 상수를 고쳐야 하며, 이 편집 필드는 "문구(표현)"만 바꾼다.
export const SHIPPING_FEE_KEY = "shipping_fee";
export const DEFAULT_SHIPPING_FEE = SHIPPING_NOTICE;

// 편집 가능한 전체 키 — 액션 enum·타입 안전의 단일 출처.
export const CONTENT_KEYS = [
  PHILOSOPHY_KEY,
  ...HOME_PILLAR_LABEL_KEYS,
  ...HOME_PILLAR_KEYS,
  HOME_CTA_KEY,
  PREP_NOTICE_TEXT_KEY,
  ...CRITERIA_LABEL_KEYS,
  ...CRITERIA_BODY_KEYS,
  CRITERIA_SUBTITLE_KEY,
  CRITERIA_HEADING_KEY,
  SHIPPING_INFO_KEY,
  SHIPPING_FEE_KEY,
] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

// 철학 소개 기본 문구 — 문단은 빈 줄로 구분한다(렌더 시 <p> 로 분리).
export const DEFAULT_PHILOSOPHY = `わび-さび (WABI-SABI)는 불완전함과 무상함의 아름다움을 받아들이는 일본의 미학입니다.

저희는 시간의 흔적이 담긴 기물과 오브제를 큐레이션합니다. 각 기물은 장인의 손길이 닿은 유일무이한 작품입니다.`;

// 홈 철학 3주 본문 기본값(한자는 helix-journey 에 고정). 키 순서와 1:1 대응.
export const DEFAULT_PILLARS: Record<
  (typeof HOME_PILLAR_KEYS)[number],
  string
> = {
  home_pillar_wabi: "소박함과 절제. 덜어낼수록 선명해지는 본질을 담습니다.",
  home_pillar_sabi: "시간의 흔적. 낡음과 결이 만드는 고요한 깊이를 아낍니다.",
  home_pillar_select:
    "오래 곁에 둘 것만을. 만든 이와 쓰는 이의 하루를 잇습니다.",
};

// 홈 철학 3주 제목(라벨) 기본값 — 편집 가능(#247). 키 순서와 1:1 대응.
export const DEFAULT_PILLAR_LABELS: Record<
  (typeof HOME_PILLAR_LABEL_KEYS)[number],
  string
> = {
  home_pillar_wabi_label: "01 와비 / WABI",
  home_pillar_sabi_label: "02 사비 / SABI",
  home_pillar_select_label: "03 큐레이션 / SELECT",
};

export const DEFAULT_HOME_CTA = "당신의 하루에 놓일 그릇, 천천히 둘러보세요 →";

// About "고르는 기준" 기본값 — 키 순서와 1:1 대응.
export const DEFAULT_CRITERIA_LABELS: Record<
  (typeof CRITERIA_LABEL_KEYS)[number],
  string
> = {
  criteria_1_label: "손의 흔적",
  criteria_2_label: "쓰임",
  criteria_3_label: "시간",
};
export const DEFAULT_CRITERIA_BODIES: Record<
  (typeof CRITERIA_BODY_KEYS)[number],
  string
> = {
  criteria_1_body:
    "물레 자국, 유약의 흐름, 어긋난 좌우. 같은 형태가 둘 없는 물건만 들입니다.",
  criteria_2_body:
    "장식장이 아니라 식탁 위에서 매일 손에 닿는, 쓰임이 분명한 물건을 고릅니다.",
  criteria_3_body:
    "쓸수록 길이 들고, 낡음이 결이 되는. 오래 곁에 둘수록 좋아지는 것만 남깁니다.",
};
export const DEFAULT_CRITERIA_SUBTITLE =
  "모든 물건은 세 가지 질문을 통과한 뒤에야 매대에 오릅니다.";
export const DEFAULT_CRITERIA_HEADING = "고르는 기준";

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

// 준비중 안내 상태(전역 layout 에서 매 요청 필요) — 캐시 + 태그. 대표님이 켜고/끄면
// 어드민 액션이 PREP_NOTICE_TAG 를 무효화한다. anon 캐시라 쿠키 의존 없음.
export const PREP_NOTICE_TAG = "prep-notice";

export type PrepNotice = { enabled: boolean; text: string };

async function loadPrepNotice(): Promise<PrepNotice> {
  const off: PrepNotice = { enabled: false, text: DEFAULT_PREP_NOTICE_TEXT };
  // 전역 layout 에서 호출 → 정적 프리렌더(/_not-found 등)와 env 미설정 빌드에서도
  // 절대 터지지 않아야 한다. Supabase env 가 없으면(빌드/CI) 안내 없이 진행하고,
  // 조회 오류도 안전측(표시 안 함)으로 폴백해 사이트 전체가 죽지 않게 한다.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return off;
  }
  try {
    const map = await getPublicContent([PREP_NOTICE_KEY, PREP_NOTICE_TEXT_KEY]);
    return {
      enabled: map[PREP_NOTICE_KEY]?.trim() === "on",
      text: map[PREP_NOTICE_TEXT_KEY]?.trim() || DEFAULT_PREP_NOTICE_TEXT,
    };
  } catch (e) {
    console.error("[prep-notice] 조회 실패 — 안내 생략", e);
    return off;
  }
}

export const getPrepNotice = unstable_cache(loadPrepNotice, ["prep-notice"], {
  revalidate: 120,
  tags: [PREP_NOTICE_TAG],
});

// 빈 줄로 구분된 텍스트를 문단 배열로. 빈 문단은 제거.
// 브라우저 textarea 는 개행을 CRLF(\r\n)로 저장할 수 있어(#251), \n{2,} 만으로는
// \r\n\r\n 을 문단 경계로 못 잡는다 → CRLF 를 LF 로 정규화한 뒤 분리한다.
export function toParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

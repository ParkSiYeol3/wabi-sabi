// 상품 검색 규칙(대표님 2026-11-08: 쇼핑몰처럼 검색). 서버(검색 결과)와 브라우저(자동완성)가
// 같은 함수를 써서 입력 중에 보이는 상품과 결과 화면이 어긋나지 않는다.
//
// 찾는 곳: 상품 이름·분류(한글·영어, 상위 분류 포함)·소재·원산지. 설명은 넣지 않는다(시열님 결정:
// "접시와 어울리는" 같은 문장 때문에 엉뚱한 상품이 섞인다). 원산지는 11/08 점검 뒤 추가("일본").
// - 띄어쓰기·대소문자·기호 무시: "나눔접시" = "나눔 접시"
// - 여러 단어는 모두 들어 있어야 한다: "우드 커트러리"
// - 한영 동의어: 우드 = Wood = 나무, 접시 = 플레이트 = Plate ...
// - 초성: "ㅈㅅ" → 접시. 자동완성에선 입력 중인 마지막 글자도 맞춘다("저" → 접시, "접ㅅ" → 접시).
//   결과 화면은 다 친 검색어라 이 규칙을 끈다("그레이"가 "그레인"에 걸리지 않게).
//
// 상품이 수십 개라 DB 전문 검색 대신 한 번 읽어 와 여기서 거른다.

export const MAX_QUERY_LENGTH = 50;
const MAX_TOKENS = 5;

export type SearchFields = {
  name: string;
  material?: string | null;
  categoryKo?: string | null;
  categoryEn?: string | null;
  parentKo?: string | null;
  parentEn?: string | null;
  origin?: string | null;
};

// 같은 뜻으로 보는 낱말 묶음. 손님이 이 중 하나를 그대로 치면 묶음 전체로 찾는다.
// 상품 이름·소재 표기가 한글·영어로 섞여 있어서(우드/Wood, 도자기/Ceramic) 필요하다.
// 11/08 점검: 손님이 칠 만한 말 54개 중 그릇·식기·밥그릇·앞접시·숟가락·유리잔·소스·티·
// 색 이름(검정·회색)·일본이 0개라 더했다. 한 낱말은 한 묶음에만 둔다.
const SYNONYMS: readonly (readonly string[])[] = [
  // 그릇 가게라 가장 먼저 칠 말 → TABLEWARE(상위 분류) 전체
  ["그릇", "식기", "테이블웨어", "tableware"],
  ["접시", "앞접시", "플레이트", "plate", "dish"],
  ["볼", "보울", "밥그릇", "국그릇", "공기", "대접", "bowl"],
  ["컵", "잔", "머그", "유리잔", "cup", "mug"],
  ["커트러리", "숟가락", "스푼", "cutlery", "flatware", "spoon"],
  ["다기", "찻잔", "티", "tea", "teaware"],
  ["종지", "소스", "소스볼", "소스그릇", "miniplate"],
  ["우드", "나무", "원목", "wood", "wooden"],
  ["도자기", "세라믹", "도기", "ceramic", "ceramics"],
  ["유리", "글라스", "glass"],
  ["스테인리스", "스테인레스", "스텐", "stainless"],
  ["한지", "hanji"],
  // 색: 상품 이름은 블랙·그레이·브라운처럼 외래어로 쓴다
  ["블랙", "검정", "검정색", "검은색", "black"],
  ["그레이", "회색", "gray", "grey"],
  ["화이트", "흰색", "하얀색", "white"],
  ["브라운", "갈색", "brown"],
  // 원산지: DB 값이 "Made in Japan" 같은 영어라
  ["일본", "일본산", "japan"],
  ["한국", "국산", "국내산", "korea"],
  ["중국", "중국산", "china"],
  ["베트남", "베트남산", "vietnam"],
];

// 띄어쓰기·기호·대소문자를 걷어 낸 비교용 문자열.
export function normalize(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s\-_/·・.,()[\]{}'"`~!?&+|]+/g, "");
}

const SYNONYM_OF = new Map<string, readonly string[]>();
for (const group of SYNONYMS) {
  const norm = group.map(normalize);
  for (const w of norm) SYNONYM_OF.set(w, norm);
}

// 검색어 → 비교용 낱말들(중복 제거, 최대 5개).
export function tokenize(q: string): string[] {
  const out: string[] = [];
  for (const raw of q.slice(0, MAX_QUERY_LENGTH).split(/\s+/)) {
    const t = normalize(raw);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_TOKENS) break;
  }
  return out;
}

// ── 한글 글자 비교 ──
const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

function syllableIndex(ch: string): number {
  const c = ch.charCodeAt(0);
  return c >= SYLLABLE_FIRST && c <= SYLLABLE_LAST ? c - SYLLABLE_FIRST : -1;
}

// q(검색어 한 글자)가 h(상품 쪽 한 글자)에 맞는가. last = 자동완성에서 검색어의 마지막 글자(입력 중).
function charMatches(q: string, h: string, last: boolean): boolean {
  if (q === h) return true;
  const hi = syllableIndex(h);
  if (hi < 0) return false;
  // 초성만 친 글자: ㅈ → 접
  if (CHOSEONG.includes(q)) return CHOSEONG[Math.floor(hi / 588)] === q;
  // 받침 없이 친 마지막 글자는 받침 있는 글자의 앞부분으로 본다: "저" → 접(입력 중)
  if (last) {
    const qi = syllableIndex(q);
    if (qi >= 0 && qi % 28 === 0) return Math.floor(qi / 28) === Math.floor(hi / 28);
  }
  return false;
}

// hay 안에서 token 이 시작하는 위치(없으면 -1). 초성·입력 중 글자를 허용한다.
function findLoose(hay: string, token: string, typing: boolean): number {
  const n = token.length;
  for (let i = 0; i + n <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < n; j++) {
      if (!charMatches(token[j], hay[i + j], typing && j === n - 1)) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

export type PreparedFields = {
  name: string;
  category: string;
  material: string;
  origin: string;
};

// 상품 한 개의 비교용 문자열을 미리 만든다(입력할 때마다 다시 만들지 않게).
export function prepareFields(f: SearchFields): PreparedFields {
  const category = [f.categoryKo, f.categoryEn, f.parentKo, f.parentEn]
    .map((s) => (s && s.trim() !== "-" ? normalize(s) : ""))
    .filter(Boolean)
    .join("|");
  return {
    name: normalize(f.name),
    category,
    material: normalize(f.material ?? ""),
    origin: normalize(f.origin ?? ""),
  };
}

// 낱말 하나의 점수. 이름에 친 글자 그대로 4(이름 첫머리면 5) > 이름에 동의어·입력 중 글자 3 >
// 분류 2 > 소재·원산지 1. 못 찾으면 0. "플레이트"를 치면 이름에 플레이트가 있는 상품이 "접시" 상품보다 앞.
function tokenScore(p: PreparedFields, token: string, typing: boolean): number {
  const synonyms = SYNONYM_OF.get(token);
  const hasSynonym = (hay: string) => !!synonyms?.some((s) => hay.includes(s));
  const found = (hay: string) =>
    !!hay && (findLoose(hay, token, typing) >= 0 || hasSynonym(hay));

  const exact = findLoose(p.name, token, false);
  if (exact >= 0) return exact === 0 ? 5 : 4;
  // 입력 중 글자로만 맞은 이름("그레이" → 그레인)은 다 맞은 이름보다 뒤
  if (typing && findLoose(p.name, token, true) >= 0) return 3;
  if (hasSynonym(p.name)) return 3;
  if (found(p.category)) return 2;
  if (found(p.material) || found(p.origin)) return 1;
  return 0;
}

// 상품 점수. 낱말 중 하나라도 못 찾으면 0(결과에서 빠짐). 낱말이 없으면 0.
// typing = 자동완성(입력 중). 마지막 글자를 받침 전 글자로도 맞춘다.
export function scoreProduct(
  p: PreparedFields,
  tokens: string[],
  { typing = false }: { typing?: boolean } = {},
): number {
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const t of tokens) {
    const s = tokenScore(p, t, typing);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

// 추천 검색어(관리자 콘텐츠): 쉼표나 줄바꿈으로 구분, 중복·빈 칸 제거, 최대 12개.
export function parseKeywords(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const raw of text.split(/[,，\n]/)) {
    const k = raw.trim().slice(0, 20);
    if (k && !out.includes(k)) out.push(k);
    if (out.length >= 12) break;
  }
  return out;
}

// 가격대 필터. 상품 가격이 4천원대~7만원이라 네 칸으로 나눈다.
export const PRICE_BANDS = [
  { key: "lt10k", label: "1만원 미만", min: 0, max: 10000 },
  { key: "10k-30k", label: "1~3만원", min: 10000, max: 30000 },
  { key: "30k-50k", label: "3~5만원", min: 30000, max: 50000 },
  { key: "50k+", label: "5만원 이상", min: 50000, max: Infinity },
] as const;
export type PriceBandKey = (typeof PRICE_BANDS)[number]["key"];

export function priceBand(key: string | undefined) {
  return PRICE_BANDS.find((b) => b.key === key);
}

export function inPriceBand(price: number, key: string | undefined): boolean {
  const band = priceBand(key);
  return !band || (price >= band.min && price < band.max);
}

export type SearchSort =
  | "relevance"
  | "newest"
  | "popular"
  | "likes"
  | "price_asc"
  | "price_desc";

export const SEARCH_SORTS: { key: SearchSort; label: string }[] = [
  { key: "relevance", label: "정확도순" },
  { key: "newest", label: "신상품순" },
  { key: "popular", label: "주문 많은 순" },
  { key: "likes", label: "좋아요순" },
  { key: "price_asc", label: "낮은 가격순" },
  { key: "price_desc", label: "높은 가격순" },
];

export function parseSearchSort(v: string | undefined): SearchSort {
  return SEARCH_SORTS.some((s) => s.key === v) ? (v as SearchSort) : "relevance";
}

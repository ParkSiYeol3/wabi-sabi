// 유입 경로 정규화(0067) — 브라우저가 보낸 referrer 와 랜딩 주소의 utm 을 받아
// 짧은 라벨 하나로 줄인다. 저장하는 건 이 라벨뿐이다(원본 주소·검색어는 버린다).
//
// 왜 서버에서 줄이나: 원본 referrer 에는 검색어·개인 페이지 주소가 섞여 들어올 수
// 있는데, 우리가 알고 싶은 건 "네이버에서 왔나 인스타에서 왔나" 뿐이다. 들어온
// 자리에서 바로 버리면 저장소에 남지 않는다.

// 내부 이동은 유입이 아니다 — 사이트 안에서 페이지를 옮긴 것뿐이다.
const SELF = "wasa.kr";

// 호스트 → 라벨. 뒤에서부터 맞춰 보므로 더 좁은 규칙(blog.naver.com)을 먼저 둔다.
const HOSTS: [RegExp, string][] = [
  [/(^|\.)blog\.naver\.com$/, "naver-blog"],
  [/(^|\.)cafe\.naver\.com$/, "naver-cafe"],
  [/(^|\.)(search\.)?naver\.com$/, "naver"],
  [/^naver\.me$/, "naver"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/^l\.facebook\.com$/, "facebook"],
  [/(^|\.)kakao\.com$/, "kakao"],
  [/^(kko\.to|open\.kakao\.com)$/, "kakao"],
  [/(^|\.)daum\.net$/, "daum"],
  [/(^|\.)youtube\.com$/, "youtube"],
  [/^youtu\.be$/, "youtube"],
  [/^t\.co$/, "x"],
  [/(^|\.)(x|twitter)\.com$/, "x"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)pinterest\./, "pinterest"],
];

// utm_source 로 들어오는 흔한 표기를 같은 라벨로 모은다(대표님이 링크에 뭘 달지
// 모르므로 넉넉히). 모르는 값은 그대로 슬러그로 남긴다.
const UTM: Record<string, string> = {
  naver: "naver",
  instagram: "instagram",
  ig: "instagram",
  insta: "instagram",
  kakao: "kakao",
  kakaotalk: "kakao",
  google: "google",
  youtube: "youtube",
  facebook: "facebook",
  threads: "threads",
  blog: "naver-blog",
};

function slug(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9가-힣._-]/g, "")
    .slice(0, 40);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * 저장할 유입 라벨. 유입이 아니면(사이트 안 이동) null.
 *
 * - utm_source 가 있으면 그게 우선이다 — 대표님이 링크에 직접 단 표시라 referrer 보다 정확하다.
 * - referrer 가 없으면 "direct"(주소 직접 입력·북마크·앱에서 열기).
 * - 우리 도메인에서 왔으면 내부 이동이라 null.
 * - 아는 호스트는 라벨로, 모르는 호스트는 호스트 이름 그대로.
 */
export function trafficSource(
  referrer: string | null | undefined,
  search: string | null | undefined,
): string | null {
  const q = (search ?? "").slice(0, 300);
  if (q) {
    try {
      const utm = new URLSearchParams(q.startsWith("?") ? q.slice(1) : q).get(
        "utm_source",
      );
      if (utm) {
        const s = slug(utm);
        if (s) return UTM[s] ?? s;
      }
    } catch {
      // 망가진 쿼리스트링은 무시하고 referrer 로 넘어간다.
    }
  }

  const ref = (referrer ?? "").trim();
  if (!ref) return "direct";

  const host = hostOf(ref);
  if (!host) return "direct";
  if (host === SELF || host.endsWith(`.${SELF}`)) return null;

  for (const [re, label] of HOSTS) if (re.test(host)) return label;
  return slug(host) || "direct";
}

// 어드민 표시용 한글 이름. 모르는 라벨(호스트)은 그대로 보여 준다.
const LABELS: Record<string, string> = {
  direct: "직접 방문",
  naver: "네이버 검색",
  "naver-blog": "네이버 블로그",
  "naver-cafe": "네이버 카페",
  google: "구글 검색",
  instagram: "인스타그램",
  threads: "스레드",
  facebook: "페이스북",
  kakao: "카카오톡",
  daum: "다음",
  youtube: "유튜브",
  x: "X(트위터)",
  bing: "빙 검색",
  pinterest: "핀터레스트",
};

export function sourceLabel(source: string): string {
  return LABELS[source] ?? source;
}

// WABI-SABI 사이트 전역 상수 — 브랜드 정보·내비게이션 단일 출처
// 출처: DESIGN_SYSTEM.md (Figma 시안). 휴무일은 고해상 Visit Us 시안 기준 = 수요일.


export const site = {
  name: "WABI-SABI",
  nameJp: "わび-さび",
  tagline: "Living Select Shop",
  categoriesLine: "Tableware · Objects · Craft · Gifts",
  // 2026-07-05 대표님 확정 (DESIGN_SYSTEM.md §7)
  hours: "12:00 – 19:00 · 매주 수요일 휴무",
  closed: "수요일 휴무",
  place: "와비사비",
  address: "충남 천안시 동남구 대흥로 338 1층 2호 와비사비 (31122)",
  addressNote: "wasa.kr 대면거래 및 택배거래처",
  // 지도 검색용 (#119) — 상호·층/호·우편번호가 섞인 문자열은 네이버·카카오에서
  // 검색이 실패한다. 도로명 주소만 따로 둔다.
  roadAddress: "충남 천안시 동남구 대흥로 338",
  addressDetail: "1층 2호",
  postcode: "31122",
  // 네이버는 검색을 거치지 않고 등록된 플레이스로 직접 진입 — 항상 정확히 뜬다.
  naverPlaceId: "2012676632",
  // 표시용 핸들 — 화면에서 앞에 @ 아이콘(AtSign)을 함께 그리므로 값에는 @ 를 빼
  // 이중 @(@@wasa.kr)를 막는다.
  instagram: "wasa.kr",
  instagramUrl: "https://www.instagram.com/wasa.kr",
  email: "0_wabisabi@naver.com",
} as const;

// 전자상거래법 §10 사업자 정보 표시 의무 (#106).
// ⚠ 빈 값은 "아직 대표님께 못 받은 값"이다. 임의로 채우지 말 것 —
// 허위 사업자정보 표시는 그 자체가 위법이다. 렌더링 쪽에서 빈 값은 생략한다.
export const business = {
  companyName: "와비사비",
  ceo: "김종순",
  address: "충남 천안시 동남구 대흥로 338 1층 2호 와비사비 (31122)",
  email: "0_wabisabi@naver.com",
  // 대표님 확인 2026-07-16 — 발급 완료값 입력. 푸터·법적고지에 자동 노출됨.
  businessNumber: "411-74-00574", // 사업자등록번호
  mailOrderNumber: "2026-충남천안-1000", // 통신판매업신고번호
  phone: "0507-1430-3085", // 고객 응대 전화번호 (가게 번호, 대표님 확인 2026-07-15)
  privacyOfficer: "", // 개인정보 보호책임자 (미기재 시 대표자)
} as const;

// 법적고지 페이지 — 푸터·약관 상호 링크의 단일 출처
export const legalNav = [
  { label: "이용약관", href: "/legal/terms" },
  { label: "개인정보처리방침", href: "/legal/privacy" },
  { label: "교환·환불 안내", href: "/legal/refund" },
] as const;

// 내비 — HOME·SHOP·SHOWROOM·NOTICE·Q&A (대표님 페이지 분류 확정).
//  · HOME=나선형 여정(/), SHOP=전체 상품(/shop), SHOWROOM=오시는 길+브랜드 소개
//    (/about), NOTICE=공지사항(/notice), Q&A=문의(/inquiry).
//  · GIFT·MAKERS 는 nav 에서 제외(대표님 분류에서 빠짐) — 페이지(/gift·/makers)는
//    남겨 두어 필요 시 되살린다.
export const nav = [
  { label: "HOME", href: "/" },
  { label: "SHOP", href: "/shop" },
  { label: "SHOWROOM", href: "/about" },
  { label: "NOTICE", href: "/notice" },
  { label: "Q&A", href: "/inquiry" },
] as const;

// Shop 카테고리 2계층 트리 (#193, 대표님 피드백 — 상품군 확장: 다도·액세서리 등).
// DB(categories, 마이그 0032)와 여기가 함께 진실이다 — 트리를 바꾸면 마이그도 함께.
// 상품은 소분류(잎)에 연결하고, '선물'처럼 하위 없는 대분류엔 직접 연결한다.
// All=전체보기. (월간 그릇 필터는 오프라인 매장 전용 전환으로 제거 — 대표님)
export type CategoryLeaf = { slug: string; ko: string; en: string };
export type CategoryNode = CategoryLeaf & {
  children?: readonly CategoryLeaf[];
};

// 2대분류 재편(0037, 대표님 지시): 그릇류 TABLEWARE / 오브제·소품 OBJECTS.
// 대분류 이름은 영문 대문자로 노출, 소분류는 한글. DB(0037)와 함께 진실 —
// 트리를 바꾸면 마이그도 함께. 이 코드 트리는 DB 조회 실패 시 폴백이다.
export const categoryTree: readonly CategoryNode[] = [
  {
    slug: "tableware",
    ko: "TABLEWARE",
    en: "Tableware",
    children: [
      { slug: "plate", ko: "접시", en: "Plate" },
      { slug: "bowl", ko: "볼", en: "Bowl" },
      { slug: "cup", ko: "컵", en: "Cup" },
      { slug: "cutlery", ko: "커트러리", en: "Cutlery" },
      { slug: "teaware", ko: "다기", en: "Teaware" },
      { slug: "fan", ko: "부채", en: "Fan" },
    ],
  },
  {
    slug: "objects",
    ko: "OBJECTS",
    en: "Objects",
    children: [
      { slug: "accessory", ko: "액세서리", en: "Accessory" },
      { slug: "life", ko: "생활 소품", en: "Life" },
      { slug: "craft", ko: "공예", en: "Craft" },
      // 선물 소분류 제거 — GIFT 대분류(/gift)로 대체(대표님). DB 는 0045 로 숨김.
    ],
  },
] as const;

// (필터용 slug 확장 categorySlugs 는 0036 DB 구조 승격으로
//  lib/queries/categories.ts getCategorySlugs 로 이동 — 어드민 추가 분류 반영.)

// (월간 그릇 MONTHLY_SLUG 제거 — 오프라인 매장 전용으로 전환돼 온라인 노출·필터 없음. 대표님)

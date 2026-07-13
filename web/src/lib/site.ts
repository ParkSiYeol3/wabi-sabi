// WABI-SABI 사이트 전역 상수 — 브랜드 정보·내비게이션 단일 출처
// 출처: DESIGN_SYSTEM.md (Figma 시안). 휴무일은 고해상 Visit Us 시안 기준 = 수요일.

export const site = {
  name: "WABI-SABI",
  nameJp: "わび-さび",
  tagline: "Living Select Shop",
  categoriesLine: "Tableware · Objects · Craft · Gifts",
  // 2026-07-05 대표님 확정 (DESIGN_SYSTEM.md §7)
  hours: "12:00 – 19:00",
  closed: "수요일 휴무",
  place: "와비사비",
  address: "충남 천안시 동남구 대흥로 338 1층 2호 와비사비 (31122)",
  addressNote: "wasa.kr 대면거래 및 택배거래처",
  instagram: "@wasa.kr",
  instagramUrl: "https://www.instagram.com/wasa.kr",
  email: "info@wasa.kr",
} as const;

// 전자상거래법 §10 사업자 정보 표시 의무 (#106).
// ⚠ 빈 값은 "아직 대표님께 못 받은 값"이다. 임의로 채우지 말 것 —
// 허위 사업자정보 표시는 그 자체가 위법이다. 렌더링 쪽에서 빈 값은 생략한다.
export const business = {
  companyName: "와비사비",
  ceo: "김종순",
  address: "충남 천안시 동남구 대흥로 338 1층 2호 (31122)",
  email: "info@wasa.kr",
  // 👤 대표님 확인 필요 — 받는 즉시 채우면 푸터·법적고지에 자동 노출됨
  businessNumber: "", // 사업자등록번호 (000-00-00000)
  mailOrderNumber: "", // 통신판매업신고번호 (제0000-지역-0000호)
  phone: "", // 고객 응대 전화번호
  privacyOfficer: "", // 개인정보 보호책임자 (미기재 시 대표자)
} as const;

// 법적고지 페이지 — 푸터·약관 상호 링크의 단일 출처
export const legalNav = [
  { label: "이용약관", href: "/legal/terms" },
  { label: "개인정보처리방침", href: "/legal/privacy" },
  { label: "교환·환불 안내", href: "/legal/refund" },
] as const;

export const nav = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

// Shop 물건 종류 7종 (category_id). All=전체보기, monthly=이 달의 상품(is_monthly 플래그)은
// 카테고리가 아니라 Shop 탭에서 별도 처리한다. (src/app/shop/page.tsx)
export const categories = [
  { slug: "plate", ko: "접시", en: "Plate" },
  { slug: "bowl", ko: "볼", en: "Bowl" },
  { slug: "cup", ko: "컵", en: "Cup" },
  { slug: "cutlery", ko: "커트러리", en: "Cutlery" },
  { slug: "life", ko: "리빙", en: "Life" },
  { slug: "gift", ko: "선물", en: "Gift" },
  { slug: "craft", ko: "공예", en: "Craft" },
] as const;

// 이 달의 상품 — Shop 탭에서 카테고리와 같은 줄에 노출하되 필터는 is_monthly 로 동작.
export const MONTHLY_SLUG = "monthly";

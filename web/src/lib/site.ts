// WABI-SABI 사이트 전역 상수 — 브랜드 정보·내비게이션 단일 출처
// 출처: DESIGN_SYSTEM.md (Figma 시안). 휴무일은 고해상 Visit Us 시안 기준 = 수요일.

export const site = {
  name: "WABI-SABI",
  nameJp: "わび-さび",
  tagline: "Living Select Shop",
  categoriesLine: "Tableware · Objects · Craft · Gifts",
  hours: "오후 12:00 – 7:00",
  closed: "수요일 휴무",
  place: "Artist House",
  address: "서울 종로구 필운대로1길 22 2층 와비사비",
  addressNote: "wasa.kr 김은정의 대면거래 및 택배거래처",
  instagram: "@wasa.kr",
  instagramUrl: "https://www.instagram.com/wasa.kr",
  email: "info@wasa.kr",
} as const;

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

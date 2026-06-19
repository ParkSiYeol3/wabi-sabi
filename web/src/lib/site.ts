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

export const categories = [
  { slug: "tableware", ko: "식기", en: "Tableware" },
  { slug: "objects", ko: "오브제", en: "Objects" },
  { slug: "craft", ko: "공예", en: "Craft" },
  { slug: "gifts", ko: "선물", en: "Gifts" },
] as const;

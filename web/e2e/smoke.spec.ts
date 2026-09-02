import { test, expect } from "@playwright/test";
import { addFirstInStockToCart } from "./helpers";

// 핵심 구매 여정 스모크 (#221). 로그인 없이 도달 가능한 경로만 —
// 결제 위젯 이후는 실결제 위험이 있어 auth 게이트 확인까지가 범위다.

// '정식 오픈 준비중' 안내 모달(PrepNotice)은 세션당 1회 전체화면으로 떠 첫 클릭을
// 가로챈다. 매 테스트가 새 컨텍스트라 세션마다 다시 뜨므로, 페이지 스크립트보다
// 먼저 세션 저장소에 '닫음' 표시를 심어 모달이 아예 열리지 않게 한다(상호작용 안정).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("wasa_prep_dismissed", "1");
    } catch {}
  });
});

test("홈 — 헬릭스 곡선이 렌더된다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/WABI-SABI/);
  // 나선 세그먼트 path 들 (aria-hidden svg)
  const paths = page.locator("svg path");
  expect(await paths.count()).toBeGreaterThan(10);
});

test("shop — 상품 목록이 보인다", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  // 검색창은 제거됨(대표님 — 선 없는 담백함, ?q= URL 은 계속 동작). 목록 노출만 검증.
  // 상품 카드 링크 1개 이상
  const productLinks = page.locator('a[href^="/shop/"]');
  expect(await productLinks.count()).toBeGreaterThan(0);
});

test("상세 → 담기 → 장바구니 → 주문하기(auth 게이트)", async ({ page }) => {
  // 재고 있는 첫 상품을 담는다(첫 상품이 품절이면 다음 상품 — 재고예약 반영).
  const added = await addFirstInStockToCart(page);
  test.skip(!added, "재고 있는 상품 없음 — 담기 스킵");

  // 헤더 배지 (1개) — 담은 뒤 상세 페이지(홈 아님)라 헤더 존재
  await expect(
    page.getByRole("link", { name: /장바구니 \(1개\)/ }),
  ).toBeVisible();

  // 장바구니 → 항목 → 주문하기 → 체크아웃. 비회원도 결제 가능(#470)이라 /auth
  // 게이트 없이 주문/결제 폼으로 진입한다. 실결제 위험이 있어 폼 도달까지가 범위
  // (결제 버튼은 누르지 않는다).
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "장바구니" })).toBeVisible();
  await page.getByRole("link", { name: "주문하기" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "주문/결제" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "배송지" })).toBeVisible();
});

test("푸터 — 전자상거래법 사업자 표시", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByText(/사업자등록번호 411-74-00574/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /사업자정보확인/ }),
  ).toBeVisible();
});

test("contact → about — 오시는 길·지도 링크", async ({ page }) => {
  // /contact 는 소개(/about)로 영구 이전(0037). 리다이렉트 후 '오시는 길' 섹션 확인.
  await page.goto("/contact");
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "오시는 길" })).toBeVisible();
  // 지도 SDK 렌더는 외부 요인(콘솔 등록 등)에 취약 — 스모크는 지도 링크 3종으로 검증
  for (const name of ["네이버 지도", "카카오맵", "구글 지도"]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
});

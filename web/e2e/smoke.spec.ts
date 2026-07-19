import { test, expect } from "@playwright/test";

// 핵심 구매 여정 스모크 (#221). 로그인 없이 도달 가능한 경로만 —
// 결제 위젯 이후는 실결제 위험이 있어 auth 게이트 확인까지가 범위다.

test("홈 — 헬릭스 곡선이 렌더된다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/WABI-SABI/);
  // 나선 세그먼트 path 들 (aria-hidden svg)
  const paths = page.locator("svg path");
  expect(await paths.count()).toBeGreaterThan(10);
});

test("shop — 상품 목록·검색 폼이 보인다", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  await expect(page.getByRole("searchbox").first()).toBeVisible();
  // 상품 카드 링크 1개 이상
  const productLinks = page.locator('a[href^="/shop/"]');
  expect(await productLinks.count()).toBeGreaterThan(0);
});

test("상세 → 담기 → 장바구니 → 주문하기(auth 게이트)", async ({ page }) => {
  await page.goto("/shop");
  // 첫 상품 상세 진입
  await page.locator('a[href^="/shop/"]').first().click();
  await expect(page).toHaveURL(/\/shop\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 담기 (상세 버튼 텍스트 "장바구니") — 품절이면 비활성 → 스킵
  const add = page.getByRole("button", { name: "장바구니", exact: true });
  await expect(add).toBeVisible();
  // 하이드레이션 중 일시 비활성일 수 있어 5초까지 기다린 뒤에만 품절로 판단
  try {
    await expect(add).toBeEnabled({ timeout: 5_000 });
  } catch {
    test.skip(true, "첫 상품 품절 — 담기 스킵");
  }
  await add.click();

  // 헤더 배지 (1개) — 홈이 아닌 페이지라 헤더 존재
  await expect(
    page.getByRole("link", { name: /장바구니 \(1개\)/ }),
  ).toBeVisible();

  // 장바구니 → 항목 → 주문하기 → 비로그인이므로 /auth 게이트
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "장바구니" })).toBeVisible();
  await page.getByRole("link", { name: "주문하기" }).click();
  await expect(page).toHaveURL(/\/auth\?redirect=/);
});

test("푸터 — 전자상거래법 사업자 표시", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByText(/사업자등록번호 411-74-00574/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /사업자정보확인/ }),
  ).toBeVisible();
});

test("contact — 지도 카드와 채널 링크", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("네이버 스마트스토어")).toBeVisible();
  // 지도 SDK 렌더는 외부 요인(콘솔 등록 등)에 취약 — 스모크는 지도 링크 3종으로 검증
  for (const name of ["네이버 지도", "카카오맵", "구글 지도"]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
});

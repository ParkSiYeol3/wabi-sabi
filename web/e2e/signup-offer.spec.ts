import { test, expect } from "@playwright/test";

// 가입 축하 쿠폰 안내(#722) — 비로그인 손님용 하단 카드·모바일 상세 띠.
// 쿠폰이 꺼져 있으면(가입 자동 지급 쿠폰 없음) 안내 자체가 없으므로 건너뛴다.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("wasa_prep_dismissed", "1");
    } catch {}
  });
});

const card = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "회원가입 혜택 안내" }).filter({ visible: true });

test("홈에서는 뜨지 않고, shop 에서는 뜬다", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(card(page)).toHaveCount(0);

  await page.goto("/shop");
  const shown = card(page);
  const visible = await shown
    .first()
    .waitFor({ state: "visible", timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!visible, "가입 자동 지급 쿠폰이 없다(안내 꺼짐)");
  await expect(shown.first()).toContainText("쿠폰");
  // 조건을 함께 적는다 — 조건 없는 "무료배송"은 과장 광고.
  await expect(shown.first()).toContainText(/이상/);
  await expect(shown.first().getByRole("link")).toHaveAttribute(
    "href",
    /\/auth\?tab=signup&redirect=%2Fshop/,
  );
});

test("닫으면 새로고침해도 다시 안 뜬다(7일)", async ({ page }) => {
  await page.goto("/shop");
  const shown = card(page).first();
  const visible = await shown
    .waitFor({ state: "visible", timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!visible, "가입 자동 지급 쿠폰이 없다(안내 꺼짐)");
  await shown.getByRole("button", { name: "안내 닫기" }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(card(page)).toHaveCount(0);
});

test("모바일 상품 상세 — 띠가 구매 바를 가리지 않는다", async ({ page, isMobile }) => {
  test.skip(!isMobile, "모바일 전용 배치");
  await page.goto("/shop");
  await page.locator('a[href^="/shop/"]').first().click();
  await page.waitForURL(/\/shop\/[^/?]+$/);
  const bar = page.locator("[data-buy-bar]");
  await expect(bar).toBeVisible();
  const strip = card(page).first();
  const visible = await strip
    .waitFor({ state: "visible", timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!visible, "가입 자동 지급 쿠폰이 없다(안내 꺼짐)");
  const s = (await strip.boundingBox())!;
  const b = (await bar.boundingBox())!;
  // 띠의 아래 끝이 구매 바 위 끝보다 위에 있어야 한다.
  expect(s.y + s.height).toBeLessThanOrEqual(b.y);
});

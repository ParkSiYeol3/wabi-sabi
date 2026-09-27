import { test, expect, type Page } from "@playwright/test";

// 가입 축하 쿠폰 안내(#722) — 비로그인 손님용 하단 카드·모바일 상세 띠.
//
// 쿠폰이 꺼져 있으면(가입 자동 지급 쿠폰 없음) 안내 자체가 없으므로 건너뛴다. 단
// "쿠폰 없음"은 서버가 body[data-signup-offer] 로 알려 준 경우만이다 — 켜져 있는데
// 안내가 안 뜨면 그건 회귀라 실패해야 한다(건너뛰면 고장을 못 본다).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("wasa_prep_dismissed", "1");
    } catch {}
  });
});

const banner = (page: Page) =>
  page
    .getByRole("complementary", { name: "회원가입 혜택 안내" })
    .filter({ visible: true });

async function skipIfOfferOff(page: Page) {
  const state = await page.locator("body").getAttribute("data-signup-offer");
  test.skip(state === "off", "가입 자동 지급 쿠폰이 없다(안내 꺼짐)");
}

test("홈에서는 뜨지 않고, shop 에서는 뜬다", async ({ page }) => {
  await page.goto("/");
  await skipIfOfferOff(page);
  await page.waitForTimeout(2500);
  await expect(banner(page)).toHaveCount(0);

  await page.goto("/shop");
  const shown = banner(page).first();
  await expect(shown).toBeVisible({ timeout: 6000 });
  await expect(shown).toContainText("쿠폰");
  // 조건을 함께 적는다 — 조건 없는 "무료배송"은 과장 광고.
  await expect(shown).toContainText(/이상/);
  await expect(shown.getByRole("link")).toHaveAttribute(
    "href",
    /\/auth\?tab=signup&redirect=%2Fshop/,
  );
});

test("닫으면 새로고침해도 다시 안 뜬다(7일)", async ({ page }) => {
  await page.goto("/shop");
  await skipIfOfferOff(page);
  const shown = banner(page).first();
  await expect(shown).toBeVisible({ timeout: 6000 });
  await shown.getByRole("button", { name: "안내 닫기" }).click();
  await expect(banner(page)).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(banner(page)).toHaveCount(0);
});

test("모바일 상품 상세 — 띠가 구매 바를 가리지 않고 조건이 보인다", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "모바일 전용 배치");
  await page.goto("/shop");
  await skipIfOfferOff(page);
  await page.locator('a[href^="/shop/"]').first().click();
  await page.waitForURL(/\/shop\/[^/?]+$/);
  const bar = page.locator("[data-buy-bar]");
  await expect(bar).toBeVisible();
  const strip = banner(page).first();
  await expect(strip).toBeVisible({ timeout: 6000 });
  // 띠의 아래 끝이 구매 바 위 끝보다 위에 있어야 한다. 띠는 0.5초간 아래에서 올라오며
  // 나타나므로(구매 바 뒤에서 올라온다) 멈춘 뒤의 자리를 본다.
  const gap = async () => {
    const s = (await strip.boundingBox())!;
    const b = (await bar.boundingBox())!;
    return b.y - (s.y + s.height);
  };
  await expect.poll(gap, { timeout: 3000 }).toBeGreaterThanOrEqual(0);
  // 최소 주문 조건은 잘리지 않고 보여야 한다.
  await expect(strip.getByText(/이상/)).toBeVisible();
});

import { expect, type Page } from "@playwright/test";

// /shop 에서 재고 있는 첫 상품을 장바구니에 담는다(담았으면 true).
// ① 품절 카드는 그리드에서 'Out of Stock' 오버레이를 달고 나오므로(매장 예약분 포함
//    — 재고 1개면 품절) 그 문구가 없는 첫 카드로 진입한다(결정적).
// ② 옵션 상품은 담기 버튼이 옵션 선택 전까지 비활성이라, 각 옵션 그룹(fieldset)에서
//    재고 있는 첫 값(button[aria-pressed], 품절값은 disabled)을 골라 활성화한다.
//    단순 상품은 옵션 그룹이 없어 바로 활성.
// 종료 시 커서는 담은 상품 상세에 있다.
export async function addFirstInStockToCart(page: Page): Promise<boolean> {
  await page.goto("/shop");
  const firstInStock = page
    .locator('a[href^="/shop/"]')
    .filter({ hasNotText: "Out of Stock" })
    .first();
  if ((await firstInStock.count()) === 0) return false;

  await firstInStock.click();
  await expect(page).toHaveURL(/\/shop\/[0-9a-f-]+/);

  const add = page.getByRole("button", { name: "장바구니", exact: true });
  await expect(add).toBeVisible();

  // 하이드레이션 직후 잠시 비활성일 수 있어 짧게 확인 후, 여전히 비활성이면 옵션 선택.
  if (!(await add.isEnabled().catch(() => false))) {
    const groups = page.locator("fieldset");
    for (let i = 0; i < (await groups.count()); i++) {
      const value = groups
        .nth(i)
        .locator("button[aria-pressed]:not([disabled])")
        .first();
      if (await value.count()) await value.click();
    }
  }

  try {
    await expect(add).toBeEnabled({ timeout: 5_000 });
  } catch {
    return false; // 재고 표시와 달리 담기 불가(옵션 값 전부 품절 등) — 안전하게 스킵
  }
  await add.click();
  return true;
}

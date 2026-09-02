import { test, expect } from "@playwright/test";
import { addFirstInStockToCart } from "./helpers";

// 신규 기능 스모크 (🟡-6) — 오늘의 와비사비 커뮤니티·마이페이지 게이트·장바구니.
// 로그인 없이 도달 가능한 표면만 검증(닉네임 모달·글쓰기는 계정 필요라 범위 밖).

// '정식 오픈 준비중' 안내 모달(PrepNotice)이 첫 클릭을 가로채지 않도록, 페이지
// 스크립트보다 먼저 세션 저장소에 '닫음'을 심는다(smoke.spec 과 동일 가드).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("wasa_prep_dismissed", "1");
    } catch {}
  });
});

test("오늘의 와비사비 — 페이지·비로그인 작성 안내", async ({ page }) => {
  await page.goto("/today");
  await expect(
    page.getByRole("heading", { name: "오늘의 와비사비" }),
  ).toBeVisible();
  // 비로그인 상태: 로그인 후 작성 안내가 보인다(폼 대신).
  await expect(
    page.getByText(/사진과 이야기를 남길 수 있습니다/),
  ).toBeVisible();
});

test("오늘의 와비사비 — 게시물이 있으면 상세로 이동", async ({ page }) => {
  await page.goto("/today");
  // 카드(사진/캡션)만 /today/<id> 로 링크된다(사이드바 CTA 는 /today).
  const cards = page.locator('a[href^="/today/"]');
  const n = await cards.count();
  test.skip(n === 0, "게시물 없음 — 상세 스킵");

  await cards.first().click();
  await expect(page).toHaveURL(/\/today\/[0-9a-f-]+/);
  // 상세 고유 요소 — 댓글 섹션 헤딩(목록엔 없다).
  await expect(page.getByRole("heading", { name: /댓글/ })).toBeVisible();
});

test("마이페이지 — 비로그인 시 로그인으로 리다이렉트", async ({ page }) => {
  await page.goto("/mypage");
  await expect(page).toHaveURL(/\/auth\?redirect=/);
});

// 장바구니 상품 → 상세 링크 (#587, 대표님). 담긴 상품(이미지+정보)을 누르면
// 해당 상세로 이동한다. 수량·삭제 컨트롤은 링크 밖이라 중첩 인터랙션 없음.
test("장바구니 — 담긴 상품을 누르면 상세로 이동", async ({ page }) => {
  const added = await addFirstInStockToCart(page);
  test.skip(!added, "재고 있는 상품 없음 — 담기 스킵");

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "장바구니" })).toBeVisible();
  // /cart 에서 /shop/<id> 로 가는 링크는 담긴 상품뿐(‘쇼핑 계속하기’=/shop exact).
  const itemLink = page.locator('a[href^="/shop/"]').first();
  await expect(itemLink).toBeVisible();
  await itemLink.click();
  await expect(page).toHaveURL(/\/shop\/[0-9a-f-]+/);
});

// (배경음/AmbientPlayer 테스트 제거 — 해당 기능이 코드에서 제거되어 스모크 대상 아님.)

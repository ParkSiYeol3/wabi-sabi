import { test, expect } from "@playwright/test";

// 신규 기능 스모크 (🟡-6) — 오늘의 와비사비 커뮤니티·마이페이지 게이트·배경음.
// 로그인 없이 도달 가능한 표면만 검증(닉네임 모달·글쓰기는 계정 필요라 범위 밖).

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

test("배경음 — 홈에 재생 토글이 있고, 클릭 유도 힌트가 뜬다", async ({
  page,
}) => {
  await page.goto("/");
  // 토글 버튼(비재생 상태 라벨) — 전 페이지 공통.
  await expect(
    page.getByRole("button", { name: "배경음 켜기" }),
  ).toBeVisible();
  // 홈에서만 뜨는 클릭 유도 힌트(0.9s 지연 후 등장).
  await expect(
    page.getByText("화면을 클릭하면 잔잔한 배경음이 흐릅니다"),
  ).toBeVisible({ timeout: 4_000 });
});

test("배경음 힌트 — 홈이 아닌 페이지엔 뜨지 않는다", async ({ page }) => {
  await page.goto("/shop");
  // 잠깐 기다려도(힌트 지연보다 길게) 힌트 문구가 없어야 한다.
  await page.waitForTimeout(1_500);
  await expect(
    page.getByText("화면을 클릭하면 잔잔한 배경음이 흐릅니다"),
  ).toHaveCount(0);
});

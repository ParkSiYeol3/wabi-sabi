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

// 결제 직전 계산 검증 — 8/29 실결제 이후 장바구니 줄 신원(0064)·재고 합산(0065)·
// 쿠폰 유형(0066)이 전부 바뀌었는데 그 뒤로 실결제가 한 건도 없었다(오픈 1주차
// 점검). 결제 버튼은 여전히 누르지 않는다(주문이 실제로 만들어지고 결제창이 뜬다).
// 대신 손님이 내야 할 금액이 화면에서 맞아떨어지는지, 필수값 없이 눌렀을 때
// 주문이 안 만들어지는지까지 본다.
test("체크아웃 — 금액 계산과 필수값 가드", async ({ page }) => {
  const added = await addFirstInStockToCart(page);
  test.skip(!added, "재고 있는 상품 없음 — 담기 스킵");

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "주문/결제" })).toBeVisible();

  const won = async (label: string): Promise<number | null> => {
    const row = page.locator("dl div").filter({ hasText: label }).first();
    if ((await row.count()) === 0) return null;
    const text = (await row.innerText()).replace(/[^0-9무료]/g, "");
    if (text.includes("무료")) return 0;
    const n = Number(text.replace(/[^0-9]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const subtotal = await won("상품 합계");
  const shipping = await won("배송비");
  const total = await won("총 결제금액");
  expect(subtotal, "상품 합계가 보여야 한다").not.toBeNull();
  expect(total, "총 결제금액이 보여야 한다").not.toBeNull();

  // 배송비 정책(lib/shipping)과 합계가 어긋나면 손님이 낼 금액이 틀어진다.
  expect(total).toBe((subtotal ?? 0) + (shipping ?? 0));
  // 10만원 미만이면 배송비가 붙고, 이상이면 무료 — 정책이 화면에 반영되는지.
  expect(shipping).toBe((subtotal ?? 0) >= 100_000 ? 0 : 3_500);

  // 결제 버튼에 찍힌 금액도 같아야 한다(요약과 버튼이 다른 값을 쓰면 안 된다).
  const payButton = page.getByRole("button", { name: /결제하기/ });
  await expect(payButton).toBeEnabled();
  const onButton = Number(
    ((await payButton.innerText()).match(/[0-9,]+/)?.[0] ?? "").replace(/,/g, ""),
  );
  expect(onButton).toBe(total);

  // 필수값(받는 분·연락처·주소)을 비운 채 눌러도 주문이 만들어지면 안 된다.
  // 브라우저 필수값 검사에 막혀 그 자리에 머문다.
  await payButton.click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "주문/결제" })).toBeVisible();
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

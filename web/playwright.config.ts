import { defineConfig, devices } from "@playwright/test";

// E2E 스모크 (#221) — 핵심 구매 여정이 살아있는지 검증한다.
// 대상: E2E_BASE_URL(기본 프로덕션 wasa.kr). 프리뷰는 SSO 보호라 CI 에선
// 병합 후 프로덕션 스모크로 돈다. 로컬: E2E_BASE_URL=http://localhost:3000.
// 스모크는 실제 프로덕션을 돈다. 표식이 없으면 그 방문이 매장 방문 통계(page_views)에
// 그대로 쌓여 대표님이 보는 방문자 수가 부풀려진다 — devices 의 UA 는 진짜 크롬과 같아
// 서버의 봇 필터에도 안 걸린다. UA 끝에 표식을 달아 /api/track 이 거르게 한다.
const E2E_UA = " WasaE2E/1.0";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1, // 네트워크 흔들림 1회 재시도
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://wasa.kr",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        userAgent: devices["Desktop Chrome"].userAgent + E2E_UA,
      },
    },
    {
      // chromium 기반(webkit 설치 불요)
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        userAgent: devices["Pixel 7"].userAgent + E2E_UA,
      },
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";

// E2E 스모크 (#221) — 핵심 구매 여정이 살아있는지 검증한다.
// 대상: E2E_BASE_URL(기본 프로덕션 wasa.kr). 프리뷰는 SSO 보호라 CI 에선
// 병합 후 프로덕션 스모크로 돈다. 로컬: E2E_BASE_URL=http://localhost:3000.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1, // 네트워크 흔들림 1회 재시도
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://wasa.kr",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }, // chromium 기반(webkit 설치 불요)
  ],
});

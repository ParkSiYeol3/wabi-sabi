import { chromium } from "playwright";

const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1350, height: 940 } });

await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__shifts.push({
        value: e.value,
        t: Math.round(e.startTime),
        sources: (e.sources || []).map((s) => ({
          tag: s.node?.tagName,
          cls: (s.node?.className || "").toString().slice(0, 80),
          txt: (s.node?.textContent || "").trim().slice(0, 40),
          from: s.previousRect?.top,
          to: s.currentRect?.top,
        })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const shifts = await page.evaluate(() => window.__shifts);
console.log(JSON.stringify(shifts, null, 1));
await browser.close();

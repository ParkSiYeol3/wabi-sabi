import type { MetadataRoute } from "next";

const BASE = "https://wasa.kr";

// 정적 라우트. TODO(WSB-007): Supabase 연동 후 상품 상세 URL 동적 추가.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/shop", "/about", "/contact"];
  const now = new Date();
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}

import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/queries/products";
import { SITE_URL } from "@/lib/site-url";

const BASE = SITE_URL;

// 정적 라우트 + 활성 상품 상세 URL (WSB-007/010 SEO).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // 공개 게시판 — 신선한 콘텐츠라 색인 가치 높다. 내부 링크(푸터)로만 크롤되던
    // 것을 사이트맵에 명시해 색인을 확실히 한다. 문의(/inquiry)는 비밀글 위주라 제외.
    { url: `${BASE}/today`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/notice`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/review`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    // 법적고지 (#106) — 색인 대상(전자상거래 필수 고지라 검색 노출이 정상)
    { url: `${BASE}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts();
    productRoutes = products.map((p) => ({
      url: `${BASE}/shop/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Supabase 미가용 시 정적 경로만
  }

  return [...staticRoutes, ...productRoutes];
}

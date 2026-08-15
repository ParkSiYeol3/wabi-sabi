import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
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
    // 경량 직접 조회 — lastModified 는 실제 등록일(created_at), image 는 대표 사진.
    // (getProducts 반환엔 created_at 이 없어 sitemap 전용으로 최소 컬럼만 읽는다.)
    const db = createPublicClient();
    const { data } = await db
      .from("products")
      .select("id, created_at, images")
      .eq("is_active", true)
      .returns<{ id: string; created_at: string | null; images: unknown }[]>();
    productRoutes = (data ?? []).map((p) => {
      const imgs = Array.isArray(p.images)
        ? p.images.filter((x): x is string => typeof x === "string")
        : [];
      return {
        url: `${BASE}/shop/${p.id}`,
        lastModified: p.created_at ? new Date(p.created_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        // 구글 이미지 검색 유입 — 상품 대표 사진을 사이트맵에 노출.
        ...(imgs.length ? { images: [imgs[0]] } : {}),
      };
    });
  } catch {
    // Supabase 미가용 시 정적 경로만
  }

  return [...staticRoutes, ...productRoutes];
}
